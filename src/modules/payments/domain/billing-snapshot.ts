import { z } from 'zod'

/** Contrato v1 — alinhado ao que a API Asaas documenta (assinatura + cobrança). */
export const subscriptionBillingSnapshotV1Schema = z.object({
  schemaVersion: z.literal(1),
  provider: z.literal('asaas'),
  billingType: z.string().nullable(),
  cycle: z.string().nullable(),
  subscriptionValueReais: z.number().nullable(),
  cardBrand: z.string().nullable(),
  cardLast4: z.string().nullable(),
  lastPaymentId: z.string().nullable(),
  lastPaymentValueReais: z.number().nullable(),
  lastPaymentStatus: z.string().nullable(),
  lastPaymentConfirmedAt: z.string().nullable(),
  paymentInstallmentId: z.string().nullable(),
  paymentInstallmentNumber: z.number().int().nullable(),
  capturedAt: z.string()
})

export type SubscriptionBillingSnapshotV1 = z.infer<
  typeof subscriptionBillingSnapshotV1Schema
>

export function parseBillingSnapshot(
  raw: unknown
): SubscriptionBillingSnapshotV1 | null {
  const r = subscriptionBillingSnapshotV1Schema.safeParse(raw)
  return r.success ? r.data : null
}

/** `billingType` da assinatura/cobrança Asaas (GET documentado). */
export function formatGatewayBillingTypeLabel(
  billingType: string | null | undefined
): string | null {
  if (!billingType) return null
  switch (billingType.toUpperCase()) {
    case 'CREDIT_CARD':
      return 'Cartão de crédito'
    case 'DEBIT_CARD':
      return 'Cartão de débito'
    case 'PIX':
      return 'Pix'
    case 'BOLETO':
      return 'Boleto'
    case 'UNDEFINED':
      return null
    default:
      return billingType
  }
}

/** Texto curto para parcelamento: a doc da cobrança expõe `installmentNumber` quando parcelado. */
export function formatInstallmentSummary(
  snapshot: SubscriptionBillingSnapshotV1 | null
): string | null {
  if (!snapshot?.billingType) return null
  if (snapshot.billingType.toUpperCase() !== 'CREDIT_CARD') return null
  const n = snapshot.paymentInstallmentNumber
  if (typeof n === 'number' && n > 1) {
    return `Parcela ${n}`
  }
  return 'À vista (1x)'
}
