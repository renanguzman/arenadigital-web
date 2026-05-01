import { getSupabaseAdmin } from '@/lib/supabase-server'
import { logAuditEvent } from '@/modules/audit/audit-log.service'
import { PaymentConfigurationError } from '@/modules/payments/errors'
import { getPaymentGateway } from '@/modules/payments/gateway'

export async function cancelSubscription(
  arenaId: string,
  actorId?: string
): Promise<void> {
  const supabase = getSupabaseAdmin()
  const gateway = getPaymentGateway()

  const { data } = await supabase
    .from('arena_subscriptions')
    .select('gateway_subscription_id')
    .eq('arena_id', arenaId)
    .maybeSingle()

  if (!data?.gateway_subscription_id) {
    throw new PaymentConfigurationError('No active subscription found for this arena.')
  }

  await gateway.setSubscriptionCancelAtPeriodEnd(data.gateway_subscription_id, true)

  const { error } = await supabase
    .from('arena_subscriptions')
    .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
    .eq('arena_id', arenaId)

  if (error) {
    console.error('[payments] cancelSubscription — DB update failed', {
      subscriptionId: data.gateway_subscription_id,
      error
    })
    throw new PaymentConfigurationError(error.message)
  }

  await logAuditEvent({
    entityType: 'arena_subscription',
    entityId: arenaId,
    action: 'subscription.cancel_requested',
    actorId: actorId ?? null,
    actorType: 'user',
    newValue: { cancel_at_period_end: true },
    metadata: { gateway_subscription_id: data.gateway_subscription_id }
  })
}

export async function reactivateSubscription(
  arenaId: string,
  actorId?: string
): Promise<void> {
  const supabase = getSupabaseAdmin()
  const gateway = getPaymentGateway()

  const { data } = await supabase
    .from('arena_subscriptions')
    .select('gateway_subscription_id')
    .eq('arena_id', arenaId)
    .maybeSingle()

  if (!data?.gateway_subscription_id) {
    throw new PaymentConfigurationError('No subscription found for this arena.')
  }

  await gateway.setSubscriptionCancelAtPeriodEnd(data.gateway_subscription_id, false)

  const { error } = await supabase
    .from('arena_subscriptions')
    .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
    .eq('arena_id', arenaId)

  if (error) {
    console.error('[payments] reactivateSubscription — DB update failed', {
      subscriptionId: data.gateway_subscription_id,
      error
    })
    throw new PaymentConfigurationError(error.message)
  }

  await logAuditEvent({
    entityType: 'arena_subscription',
    entityId: arenaId,
    action: 'subscription.reactivated',
    actorId: actorId ?? null,
    actorType: 'user',
    newValue: { cancel_at_period_end: false },
    metadata: { gateway_subscription_id: data.gateway_subscription_id }
  })
}
