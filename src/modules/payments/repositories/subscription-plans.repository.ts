import { getSupabaseAdmin } from '@/lib/supabase-server'

export type SubscriptionPlanRow = {
  id: string
  key: string
  label: string
  price_cents: number
  max_spaces: number
  gateway_price_id: string
  is_active: boolean
  features: unknown | null
  sort_order: number
}

const PLAN_SELECT =
  'id, key, label, price_cents, max_spaces, gateway_price_id, is_active, features, sort_order'

export async function fetchAllActivePlans(): Promise<SubscriptionPlanRow[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('subscription_plans')
    .select(PLAN_SELECT)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`[subscription-plans] Falha ao buscar planos: ${error.message}`)
  return data ?? []
}

export async function fetchPlanByKey(key: string): Promise<SubscriptionPlanRow | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('subscription_plans')
    .select(PLAN_SELECT)
    .eq('key', key)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw new Error(`[subscription-plans] Falha ao buscar plano "${key}": ${error.message}`)
  return data ?? null
}

export async function fetchPlanByGatewayPriceId(
  gatewayPriceId: string
): Promise<SubscriptionPlanRow | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('subscription_plans')
    .select(PLAN_SELECT)
    .eq('gateway_price_id', gatewayPriceId)
    .maybeSingle()

  if (error)
    throw new Error(
      `[subscription-plans] Falha ao buscar plano por price id "${gatewayPriceId}": ${error.message}`
    )
  return data ?? null
}
