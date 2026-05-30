import { getSupabaseAdmin } from '@/lib/supabase-server'
import { PARTNER_PLAN_KEY, hasUnlimitedSpaces } from '@/modules/payments/plans'
import { hasUsableSubscription } from '@/modules/payments/subscription-rules'
import { getSubscription } from '@/modules/payments/usecases/get-subscription.usecase'

export async function assertCanCreateSpaceForArena(arenaId: string) {
  const supabase = getSupabaseAdmin()
  const entitlement = await getSubscription(arenaId)

  if (!hasUsableSubscription(entitlement)) {
    throw new Error(
      'Cadastre um cartão e ative um plano antes de criar novos espaços.'
    )
  }

  if (entitlement.planKey === PARTNER_PLAN_KEY && !entitlement.card) {
    throw new Error(
      'Cadastre um cartão para liberar os recursos do plano Parceiro.'
    )
  }

  if (
    entitlement.maxSpaces == null ||
    hasUnlimitedSpaces(entitlement.maxSpaces)
  ) {
    return
  }

  const { count, error } = await supabase
    .from('courts')
    .select('id', { count: 'exact', head: true })
    .eq('arena_id', arenaId)

  if (error) throw new Error(`Erro ao contar espaços da arena: ${error.message}`)

  const currentSpaces = count ?? 0
  if (currentSpaces >= entitlement.maxSpaces) {
    throw new Error(
      `Limite do ${entitlement.planLabel ?? 'plano'} atingido: ${entitlement.maxSpaces} espaços. Atualize o plano para cadastrar mais espaços.`
    )
  }
}
