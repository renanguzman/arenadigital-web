import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getPaymentGateway } from '@/modules/payments/gateway'
import type { DomainInvoiceStatus } from '@/modules/payments/domain/types'

export type PaymentHistoryItem = {
  id: string
  amountCents: number
  status: DomainInvoiceStatus
  invoiceNumber: string | null
  description: string | null
  createdAt: string
}

export async function getPaymentHistory(arenaId: string): Promise<PaymentHistoryItem[]> {
  const supabase = getSupabaseAdmin()
  const gateway = getPaymentGateway()

  const { data } = await supabase
    .from('arena_subscriptions')
    .select('gateway_customer_id')
    .eq('arena_id', arenaId)
    .maybeSingle()

  if (!data?.gateway_customer_id) return []

  const invoices = await gateway.listCustomerInvoices(data.gateway_customer_id, 50)

  return invoices.map((inv) => ({
    id: inv.id,
    amountCents: inv.amountCents,
    status: inv.status,
    invoiceNumber: inv.number,
    description: inv.description,
    createdAt: inv.createdAtIso
  }))
}
