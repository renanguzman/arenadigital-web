import { getSupabaseAdmin } from '@/lib/supabase-server'
import { logAuditEvent } from '@/modules/audit/audit-log.service'
import { EXPERIMENTAL_PLAN_KEY } from '@/modules/payments/plans'
import { fetchPlanByKey } from '@/modules/payments/repositories/subscription-plans.repository'
import { planAccessEndIso } from '@/modules/payments/subscription-rules'

type EnsureExperimentalResult =
  | { created: true; currentPeriodEnd: string }
  | { created: false; reason: 'already_exists' | 'plan_not_found' }

/**
 * Garante que uma arena recém-criada já nasça com o Plano Experimental ativo
 * (trial de 5 dias), permitindo o uso imediato do sistema sem passar pela tela
 * de assinatura.
 *
 * Idempotente: se a arena já possui qualquer registro em `arena_subscriptions`
 * (trial em andamento, pago, cancelado, etc.), nada é alterado — não queremos
 * sobrescrever um plano existente nem reiniciar o período experimental.
 */
export async function ensureExperimentalSubscription(input: {
  arenaId: string
  actorId?: string | null
}): Promise<EnsureExperimentalResult> {
  const supabase = getSupabaseAdmin()

  const { data: existing } = await supabase
    .from('arena_subscriptions')
    .select('id')
    .eq('arena_id', input.arenaId)
    .maybeSingle()

  if (existing) {
    return { created: false, reason: 'already_exists' }
  }

  const plan = await fetchPlanByKey(EXPERIMENTAL_PLAN_KEY)
  if (!plan) {
    console.error(
      '[payments] ensure-experimental-subscription — plano experimental não encontrado/ativo'
    )
    return { created: false, reason: 'plan_not_found' }
  }

  const now = new Date()
  const expiresAt = planAccessEndIso(EXPERIMENTAL_PLAN_KEY, now)

  const { error } = await supabase.from('arena_subscriptions').insert({
    arena_id: input.arenaId,
    plan_key: plan.key,
    plan_id: plan.id,
    status: 'active',
    current_period_end: expiresAt,
    cancel_at_period_end: false,
    canceled_at: null,
    experimental_started_at: now.toISOString(),
    updated_at: now.toISOString(),
  })

  if (error) {
    // 23505 = corrida com outra requisição que já criou o registro: ok, tratamos
    // como idempotente.
    if (error.code === '23505') {
      return { created: false, reason: 'already_exists' }
    }
    console.error(
      '[payments] ensure-experimental-subscription — falha ao criar assinatura',
      { arenaId: input.arenaId, error }
    )
    throw new Error(`Erro ao ativar plano experimental: ${error.message}`)
  }

  await logAuditEvent({
    entityType: 'arena_subscription',
    entityId: input.arenaId,
    action: 'subscription.experimental_activated',
    actorId: input.actorId ?? null,
    actorType: 'system',
    newValue: {
      status: 'active',
      plan_key: plan.key,
      plan_id: plan.id,
      current_period_end: expiresAt,
    },
    metadata: { reason: 'auto_provision_on_signup' },
  })

  return { created: true, currentPeriodEnd: expiresAt }
}
