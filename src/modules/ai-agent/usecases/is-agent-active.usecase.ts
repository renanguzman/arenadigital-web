import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase.types'
import { hasUsableSubscription } from '@/modules/payments/subscription-rules'

/**
 * Verifica se a arena tem uma assinatura utilizável (ativa/trial e não expirada,
 * ou acesso interno). É o gate financeiro do agente (RNF-07). Reaproveita a
 * mesma regra usada no restante do sistema (`hasUsableSubscription`).
 */
export async function hasActiveArenaSubscription(
  client: SupabaseClient<Database>,
  arenaId: string
): Promise<boolean> {
  const { data, error } = await client
    .from('arena_subscriptions')
    .select('status, current_period_end, subscription_plans(is_internal)')
    .eq('arena_id', arenaId)
    .maybeSingle()

  if (error) {
    console.error('[ai-agent] hasActiveArenaSubscription error', { arenaId, error })
    return false
  }
  if (!data) return false

  const planRelation = data.subscription_plans as { is_internal?: boolean | null } | null
  return hasUsableSubscription({
    hasInternalAccess: planRelation?.is_internal ?? null,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
  })
}
