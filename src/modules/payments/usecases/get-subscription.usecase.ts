import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { CardDetails } from '@/modules/payments/domain/types'
import { getPaymentGateway } from '@/modules/payments/gateway'
import { planKeySchema, type PlanKey } from '@/modules/payments/plans'
import { fetchPlanByKey } from '@/modules/payments/repositories/subscription-plans.repository'

export type SubscriptionStatus =
  | 'active'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused'
  | 'none'

export type CardInfo = CardDetails

export type ArenaSubscription = {
  status: SubscriptionStatus
  planKey: PlanKey | null
  planLabel: string | null
  priceCents: number | null
  maxSpaces: number | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
  paymentMethod: string | null
  card: CardInfo | null
}

type GatewayEnrichedData = {
  paymentMethodLabel: string | null
  card: CardInfo | null
  currentPeriodEnd: string | null
}

async function fetchGatewayData(
  subscriptionId: string
): Promise<GatewayEnrichedData> {
  const gateway = getPaymentGateway()
  const sub = await gateway.retrieveSubscriptionWithPaymentMethod(subscriptionId)

  if (!sub) {
    return { paymentMethodLabel: null, card: null, currentPeriodEnd: null }
  }

  const currentPeriodEnd = sub.primaryItem?.currentPeriodEndIso ?? null
  const pm = sub.paymentMethod

  if (!pm) return { paymentMethodLabel: null, card: null, currentPeriodEnd }

  if (pm.type === 'card' && pm.card) {
    return {
      paymentMethodLabel: 'Cartão de crédito',
      card: pm.card,
      currentPeriodEnd
    }
  }

  return { paymentMethodLabel: pm.type, card: null, currentPeriodEnd }
}

export async function getSubscription(arenaId: string): Promise<ArenaSubscription> {
  const supabase = getSupabaseAdmin()

  const { data } = await supabase
    .from('arena_subscriptions')
    .select(
      'plan_key, status, current_period_end, cancel_at_period_end, canceled_at, gateway_subscription_id, subscription_plans(label, price_cents, max_spaces)'
    )
    .eq('arena_id', arenaId)
    .maybeSingle()

  if (!data) {
    return {
      status: 'none',
      planKey: null,
      planLabel: null,
      priceCents: null,
      maxSpaces: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      paymentMethod: null,
      card: null
    }
  }

  const parsedKey = planKeySchema.safeParse(data.plan_key)

  // Dados do plano vêm do join com subscription_plans via plan_id FK.
  // Fallback para null caso o join não retorne (plan_id não preenchido ainda).
  const planJoin = Array.isArray(data.subscription_plans)
    ? data.subscription_plans[0]
    : data.subscription_plans

  const fallbackPlan =
    !planJoin && parsedKey.success ? await fetchPlanByKey(parsedKey.data) : null

  let gatewayData: GatewayEnrichedData = {
    paymentMethodLabel: null,
    card: null,
    currentPeriodEnd: null
  }
  if (data.gateway_subscription_id) {
    gatewayData = await fetchGatewayData(data.gateway_subscription_id)
  }

  return {
    status: (data.status as SubscriptionStatus) ?? 'none',
    planKey: parsedKey.success ? parsedKey.data : null,
    planLabel: planJoin?.label ?? fallbackPlan?.label ?? null,
    priceCents: planJoin?.price_cents ?? fallbackPlan?.price_cents ?? null,
    maxSpaces: planJoin?.max_spaces ?? fallbackPlan?.max_spaces ?? null,
    currentPeriodEnd: data.current_period_end ?? gatewayData.currentPeriodEnd,
    cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
    canceledAt: data.canceled_at ?? null,
    paymentMethod: gatewayData.paymentMethodLabel,
    card: gatewayData.card
  }
}
