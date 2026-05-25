"use server"

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { assertArenaBackofficeAccess, assertRotativoAccess, requireAuthenticatedDbUser } from '@/lib/server-auth'
import { SupabaseRotativoRepository } from '@/modules/rotativos/repositories/SupabaseRotativoRepository'
import { SupabaseFinanceRepository } from '@/modules/finance/repositories/SupabaseFinanceRepository'
import { revalidatePath } from 'next/cache'
import {
  createRotativoInputSchema,
  updateRotativoInputSchema,
  enrollAthleteSchema,
  savePacotesSchema,
  launchCreditSchema,
} from '@/modules/rotativos/schemas/rotativo.schema'
import { CREDITO_PAYMENT_METHOD, type RotativoListFilters } from '@/modules/rotativos/types/rotativo.types'
import { canReactivateRotativo, calculateCreditPurchaseValue } from '@/modules/rotativos/utils/rotativo.utils'

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function revalidateRotativo(arenaId: string) {
  revalidatePath('/dashboard/rotativo')
  revalidatePath(`/dashboard/rotativo/${arenaId}`)
}

async function ensureAthleteBelongsToArena(arenaId: string, athleteId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('arenas_atleta')
    .select('id_atleta')
    .eq('id_arena', arenaId)
    .eq('id_atleta', athleteId)
    .maybeSingle()

  if (error) throw new Error(`Erro ao validar atleta do rotativo: ${error.message}`)
  if (!data) throw new Error('Atleta não pertence à arena informada')
}

export async function createRotativoAction(formData: unknown) {
  const parsed = createRotativoInputSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  try {
    await requireAuthenticatedDbUser()
    const { arenaId, court_ids, ...rest } = parsed.data
    await assertArenaBackofficeAccess(arenaId)

    const repo = new SupabaseRotativoRepository(getSupabaseAdmin())
    await repo.create({ ...rest, id_arena: arenaId, status: 'ativo' }, court_ids)

    revalidateRotativo(arenaId)
    return { success: true }
  } catch (error: unknown) {
    console.error('Error in createRotativoAction:', error)
    return { success: false, error: getErrorMessage(error, 'Erro ao criar rotativo') }
  }
}

export async function updateRotativoAction(formData: unknown) {
  const parsed = updateRotativoInputSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  try {
    await requireAuthenticatedDbUser()
    const { arenaId, rotativoId, court_ids, ...rest } = parsed.data
    await assertRotativoAccess(rotativoId)
    await assertArenaBackofficeAccess(arenaId)

    const repo = new SupabaseRotativoRepository(getSupabaseAdmin())
    await repo.update(rotativoId, rest, court_ids)

    revalidateRotativo(arenaId)
    return { success: true }
  } catch (error: unknown) {
    console.error('Error in updateRotativoAction:', error)
    return { success: false, error: getErrorMessage(error, 'Erro ao atualizar rotativo') }
  }
}

export async function setRotativoStatusAction(arenaId: string, rotativoId: string, status: 'ativo' | 'desativado') {
  try {
    await requireAuthenticatedDbUser()
    await assertRotativoAccess(rotativoId)
    await assertArenaBackofficeAccess(arenaId)

    const repo = new SupabaseRotativoRepository(getSupabaseAdmin())

    if (status === 'ativo') {
      const rotativo = await repo.findById(rotativoId)
      if (!rotativo) throw new Error('Rotativo não encontrado')
      if (!canReactivateRotativo(rotativo.data)) {
        throw new Error('Não é possível reativar rotativos após a data da sessão.')
      }
    }

    await repo.setStatus(rotativoId, status)

    revalidateRotativo(arenaId)
    return { success: true }
  } catch (error: unknown) {
    console.error('Error in setRotativoStatusAction:', error)
    return { success: false, error: getErrorMessage(error, 'Erro ao alterar status do rotativo') }
  }
}

export async function getRotativoByIdAction(rotativoId: string) {
  try {
    const arenaId = await assertRotativoAccess(rotativoId)
    const repo = new SupabaseRotativoRepository(getSupabaseAdmin())
    const data = await repo.findById(rotativoId)
    return { success: true, data, arenaId }
  } catch (error: unknown) {
    console.error('Error in getRotativoByIdAction:', error)
    return { success: false, error: getErrorMessage(error, 'Erro ao buscar rotativo'), data: null }
  }
}

export async function listRotativosAction(arenaId: string, filters: RotativoListFilters = {}) {
  try {
    await requireAuthenticatedDbUser()
    await assertArenaBackofficeAccess(arenaId)

    const repo = new SupabaseRotativoRepository(getSupabaseAdmin())
    const { rows, total } = await repo.list(arenaId, filters)
    return { success: true, data: rows, total }
  } catch (error: unknown) {
    console.error('Error in listRotativosAction:', error)
    return { success: false, error: getErrorMessage(error, 'Erro ao listar rotativos'), data: [], total: 0 }
  }
}

export async function getRotativosAction(arenaId: string, date: string) {
  try {
    await requireAuthenticatedDbUser()
    await assertArenaBackofficeAccess(arenaId)

    const repo = new SupabaseRotativoRepository(getSupabaseAdmin())
    const data = await repo.findByDate(arenaId, date)
    return { success: true, data }
  } catch (error: unknown) {
    console.error('Error in getRotativosAction:', error)
    return { success: false, error: getErrorMessage(error, 'Erro ao buscar rotativos') }
  }
}

export async function getRotativosByMonthAction(arenaId: string, startDate: string, endDate: string) {
  try {
    await requireAuthenticatedDbUser()
    await assertArenaBackofficeAccess(arenaId)

    const repo = new SupabaseRotativoRepository(getSupabaseAdmin())
    const data = await repo.findByMonth(arenaId, startDate, endDate)
    return { success: true, data }
  } catch (error: unknown) {
    console.error('Error in getRotativosByMonthAction:', error)
    return { success: false, error: getErrorMessage(error, 'Erro ao buscar rotativos do mes') }
  }
}

export async function getParticipantsAction(rotativoId: string) {
  try {
    await assertRotativoAccess(rotativoId)
    const repo = new SupabaseRotativoRepository(getSupabaseAdmin())
    const data = await repo.getInscritos(rotativoId)
    return { success: true, data }
  } catch (error: unknown) {
    console.error('Error in getParticipantsAction:', error)
    return { success: false, error: getErrorMessage(error, 'Erro ao buscar participantes') }
  }
}

export async function enrollAthleteAction(formData: unknown) {
  const parsed = enrollAthleteSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  try {
    const { dbUserId } = await requireAuthenticatedDbUser()
    const { rotativoId, arenaId, athleteId, paymentMethod, observacao } = parsed.data
    await assertRotativoAccess(rotativoId)
    await ensureAthleteBelongsToArena(arenaId, athleteId)

    const supabase = getSupabaseAdmin()
    const repo = new SupabaseRotativoRepository(supabase)

    const rotativo = await repo.findById(rotativoId)
    if (!rotativo) throw new Error('Rotativo não encontrado')

    const isCredit = paymentMethod === CREDITO_PAYMENT_METHOD

    if (isCredit) {
      const balance = await repo.getAthleteCreditBalance(arenaId, athleteId)
      if (balance < 1) throw new Error('Atleta não possui créditos disponíveis.')
    }

    const inscricao = await repo.registerAthlete(rotativoId, athleteId, rotativo.valor, {
      tipo_pagamento: isCredit ? 'credito' : 'avulso',
      modo_pagamento_id: isCredit ? null : paymentMethod,
      observacao: observacao ?? null,
    })

    let createdTransactionId: string | null = null

    try {
      if (isCredit) {
        await repo.consumeCredit(arenaId, athleteId, inscricao.id, dbUserId)
      } else {
        const now = new Date().toISOString()
        const sportName = rotativo.esporte?.name ?? 'Rotativo'
        let description = `Rotativo - ${sportName} - ${rotativo.data}`
        if (observacao) description += ` - ${observacao}`

        const financeRepo = new SupabaseFinanceRepository(supabase)
        const transaction = await financeRepo.create({
          arena_id: arenaId,
          type: 'entrada',
          category: 'Rotativo',
          description,
          quantity: 1,
          unit_value: rotativo.valor,
          discount: 0,
          total_value: rotativo.valor,
          registration_date: now,
          launch_date: now,
          registered_by: dbUserId,
          atleta_id: athleteId,
          modo_pagamento_id: paymentMethod,
        })
        createdTransactionId = transaction.id
      }
    } catch (innerError) {
      await supabase.from('rotativo_inscricoes').delete().eq('id', inscricao.id)
      if (createdTransactionId) {
        await supabase.from('transactions').delete().eq('id', createdTransactionId)
      }
      throw innerError
    }

    revalidatePath(`/dashboard/finance/${arenaId}`)
    revalidateRotativo(arenaId)
    return { success: true }
  } catch (error: unknown) {
    console.error('Error in enrollAthleteAction:', error)
    return { success: false, error: getErrorMessage(error, 'Erro ao inscrever atleta') }
  }
}

export async function registerAthleteAction(rotativoId: string, athleteId: string, value: number) {
  try {
    const arenaId = await assertRotativoAccess(rotativoId)
    await ensureAthleteBelongsToArena(arenaId, athleteId)

    const repo = new SupabaseRotativoRepository(getSupabaseAdmin())
    await repo.registerAthlete(rotativoId, athleteId, value, { tipo_pagamento: 'avulso' })
    revalidateRotativo(arenaId)
    return { success: true }
  } catch (error: unknown) {
    console.error('Error in registerAthleteAction:', error)
    return { success: false, error: getErrorMessage(error, 'Erro ao registrar atleta') }
  }
}

export async function getRotativoCourtsAction(arenaId: string) {
  try {
    await assertArenaBackofficeAccess(arenaId)
    const repo = new SupabaseRotativoRepository(getSupabaseAdmin())
    const data = await repo.getCourts(arenaId)
    return { success: true, data }
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, 'Erro ao buscar quadras'), data: [] }
  }
}

export async function getRotativoPacotesAction(arenaId: string) {
  try {
    await assertArenaBackofficeAccess(arenaId)
    const repo = new SupabaseRotativoRepository(getSupabaseAdmin())
    const data = await repo.getPacotes(arenaId)
    return { success: true, data }
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, 'Erro ao buscar pacotes'), data: [] }
  }
}

export async function saveRotativoPacotesAction(formData: unknown) {
  const parsed = savePacotesSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  try {
    await requireAuthenticatedDbUser()
    const { arenaId, pacotes } = parsed.data
    await assertArenaBackofficeAccess(arenaId)

    const repo = new SupabaseRotativoRepository(getSupabaseAdmin())
    const data = await repo.savePacotes(arenaId, pacotes)

    revalidateRotativo(arenaId)
    return { success: true, data }
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, 'Erro ao salvar pacotes') }
  }
}

export async function launchRotativoCreditAction(formData: unknown) {
  const parsed = launchCreditSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  try {
    const { dbUserId } = await requireAuthenticatedDbUser()
    const { arenaId, athleteId, quantidade, validityDays, modo_pagamento_id } = parsed.data
    await assertArenaBackofficeAccess(arenaId)
    await ensureAthleteBelongsToArena(arenaId, athleteId)

    const supabase = getSupabaseAdmin()
    const repo = new SupabaseRotativoRepository(supabase)
    const pacotes = await repo.getPacotes(arenaId)
    const valorPago = calculateCreditPurchaseValue(quantidade, pacotes)

    const { loteId, movimentoId } = await repo.launchCredit(
      arenaId,
      athleteId,
      quantidade,
      validityDays,
      dbUserId,
      { valor_pago: valorPago, modo_pagamento_id }
    )

    let createdTransactionId: string | null = null

    try {
      const now = new Date().toISOString()
      const financeRepo = new SupabaseFinanceRepository(supabase)
      const transaction = await financeRepo.create({
        arena_id: arenaId,
        type: 'entrada',
        category: 'Rotativo',
        description: `Crédito de rotativo - ${quantidade} crédito${quantidade !== 1 ? 's' : ''}`,
        quantity: 1,
        unit_value: valorPago,
        discount: 0,
        total_value: valorPago,
        registration_date: now,
        launch_date: now,
        registered_by: dbUserId,
        atleta_id: athleteId,
        modo_pagamento_id,
      })
      createdTransactionId = transaction.id
    } catch (financeError) {
      await supabase.from('rotativo_credito_movimentos').delete().eq('id', movimentoId)
      await supabase.from('rotativo_credito_lotes').delete().eq('id', loteId)
      throw financeError
    }

    revalidatePath(`/dashboard/finance/${arenaId}`)
    revalidateRotativo(arenaId)
    return { success: true, valorPago }
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, 'Erro ao lançar crédito') }
  }
}

export async function previewCreditPurchaseValueAction(arenaId: string, quantidade: number) {
  try {
    await assertArenaBackofficeAccess(arenaId)
    const repo = new SupabaseRotativoRepository(getSupabaseAdmin())
    const pacotes = await repo.getPacotes(arenaId)
    const valor = calculateCreditPurchaseValue(quantidade, pacotes)
    return { success: true, valor }
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, 'Erro ao calcular valor'), valor: null }
  }
}

export async function getRotativoCreditMovementsAction(
  arenaId: string,
  filters: { search?: string; page?: number; pageSize?: number } = {}
) {
  try {
    await assertArenaBackofficeAccess(arenaId)
    const repo = new SupabaseRotativoRepository(getSupabaseAdmin())
    const { rows, total } = await repo.getCreditMovements(arenaId, filters)
    return { success: true, data: rows, total }
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, 'Erro ao buscar movimentações'), data: [], total: 0 }
  }
}

export async function getTopRotativoAthletesAction(arenaId: string, limit = 5) {
  try {
    await assertArenaBackofficeAccess(arenaId)
    const repo = new SupabaseRotativoRepository(getSupabaseAdmin())
    const data = await repo.getTopAthletesByCredit(arenaId, limit)
    return { success: true, data }
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, 'Erro ao buscar ranking'), data: [] }
  }
}

export async function processExpiredRotativoCreditsAction(arenaId: string) {
  try {
    await assertArenaBackofficeAccess(arenaId)
    const repo = new SupabaseRotativoRepository(getSupabaseAdmin())
    const processed = await repo.processExpiredCredits(arenaId)
    if (processed > 0) revalidateRotativo(arenaId)
    return { success: true, processed }
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, 'Erro ao processar vencimentos'), processed: 0 }
  }
}
