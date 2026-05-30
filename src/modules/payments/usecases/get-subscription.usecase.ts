import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  formatGatewayBillingTypeLabel,
  formatInstallmentSummary,
  parseBillingSnapshot,
} from '@/modules/payments/domain/billing-snapshot'
import type { CardDetails } from '@/modules/payments/domain/types'
import { getPaymentGateway } from '@/modules/payments/gateway'
import { planKeySchema, type PlanKey } from '@/modules/payments/plans'
import { fetchPlanByKey } from '@/modules/payments/repositories/subscription-plans.repository'

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
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
  /** Valor da última cobrança confirmada (Asaas `value` em reais → centavos). */
  lastPaymentValueCents: number | null
  /** Ex.: "À vista (1x)" ou "Parcela 2" — só o que a API documenta. */
  installmentSummary: string | null
  /** ISO da última liquidação conhecida (snapshot). */
  lastPaymentConfirmedAt: string | null
}

type GatewayEnrichedData = {
  paymentMethodLabel: string | null
  card: CardInfo | null
  currentPeriodEnd: string | null
}

function reaisToCents(value: number): number {
  return Math.round(value * 100)
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

  if (!pm) {
    return {
      paymentMethodLabel: formatGatewayBillingTypeLabel(sub.gatewayBillingType),
      card: null,
      currentPeriodEnd,
    }
  }

  if (pm.type === 'card' && pm.card) {
    return {
      paymentMethodLabel:
        formatGatewayBillingTypeLabel(sub.gatewayBillingType) ??
        'Cartão de crédito',
      card: pm.card,
      currentPeriodEnd,
    }
  }

  return {
    paymentMethodLabel: formatGatewayBillingTypeLabel(sub.gatewayBillingType),
    card: null,
    currentPeriodEnd,
  }
}

/** Quando CHECKOUT_PAID gravou o objeto `subscription` em gateway_subscription_id (bug). */
function currentPeriodEndFromCorruptCheckoutSubscriptionField(
  gatewaySubscriptionIdRaw: string | null | undefined
): string | null {
  const raw = gatewaySubscriptionIdRaw?.trim()
  if (!raw?.startsWith('{')) return null
  try {
    const o = JSON.parse(raw) as { nextDueDate?: string }
    if (!o.nextDueDate) return null
    const nd = o.nextDueDate.trim()
    if (nd.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(nd)) return nd
    return nd
  } catch {
    return null
  }
}

export async function getSubscription(arenaId: string): Promise<ArenaSubscription> {
  const supabase = getSupabaseAdmin()

  const { data } = await supabase
    .from('arena_subscriptions')
    .select(
      'plan_key, status, current_period_end, cancel_at_period_end, canceled_at, gateway_subscription_id, billing_snapshot, subscription_plans(label, price_cents, max_spaces)'
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
      card: null,
      lastPaymentValueCents: null,
      installmentSummary: null,
      lastPaymentConfirmedAt: null,
    }
  }

  const parsedKey = planKeySchema.safeParse(data.plan_key)

  const gatewaySubscriptionId =
    typeof data.gateway_subscription_id === 'string' &&
    data.gateway_subscription_id.trim() &&
    !data.gateway_subscription_id.trim().startsWith('{')
      ? data.gateway_subscription_id.trim()
      : null

  const snapshot = parseBillingSnapshot(data.billing_snapshot)

  const planJoin = Array.isArray(data.subscription_plans)
    ? data.subscription_plans[0]
    : data.subscription_plans

  const fallbackPlan =
    !planJoin && parsedKey.success ? await fetchPlanByKey(parsedKey.data) : null

  let gatewayData: GatewayEnrichedData = {
    paymentMethodLabel: null,
    card: null,
    currentPeriodEnd: null,
  }
  if (gatewaySubscriptionId) {
    gatewayData = await fetchGatewayData(gatewaySubscriptionId)
  }

  const paymentMethodLabel =
    gatewayData.paymentMethodLabel ??
    formatGatewayBillingTypeLabel(snapshot?.billingType ?? null) ??
    null

  const card =
    gatewayData.card ??
    (snapshot?.cardBrand && snapshot.cardLast4
      ? { brand: snapshot.cardBrand, last4: snapshot.cardLast4 }
      : null)

  const checkoutCorruptPeriodEnd = currentPeriodEndFromCorruptCheckoutSubscriptionField(
    data.gateway_subscription_id
  )

  const lastPaymentValueCents =
    typeof snapshot?.lastPaymentValueReais === 'number'
      ? reaisToCents(snapshot.lastPaymentValueReais)
      : null

  return {
    status: (data.status as SubscriptionStatus) ?? 'none',
    planKey: parsedKey.success ? parsedKey.data : null,
    planLabel: planJoin?.label ?? fallbackPlan?.label ?? null,
    priceCents: planJoin?.price_cents ?? fallbackPlan?.price_cents ?? null,
    maxSpaces: planJoin?.max_spaces ?? fallbackPlan?.max_spaces ?? null,
    currentPeriodEnd:
      data.current_period_end ??
      gatewayData.currentPeriodEnd ??
      checkoutCorruptPeriodEnd,
    cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
    canceledAt: data.canceled_at ?? null,
    paymentMethod: paymentMethodLabel,
    card,
    lastPaymentValueCents,
    installmentSummary: formatInstallmentSummary(snapshot),
    lastPaymentConfirmedAt: snapshot?.lastPaymentConfirmedAt ?? null,
  }
}
