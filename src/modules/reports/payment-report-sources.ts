import type { PaymentStatusFilters } from '@/modules/reports/types/report.types'

/** Categorias espelhadas em outra fonte do relatório — nunca contam via Financeiro. */
export const SYSTEM_MIRRORED_TRANSACTION_CATEGORIES = ['Reserva Avulsa', 'Rotativo'] as const

export type ReportQueryMode = 'full' | 'mensal' | 'avulso' | 'booking_scoped'

export type ReportSourceFlags = {
  mode: ReportQueryMode
  includeStationPayments: boolean
  includeRotativoInscricoes: boolean
  includeRotativoCreditos: boolean
  includeTransactions: boolean
}

type BookingLike = {
  plano_mensalista_id: string | null
  status: string | null
}

export function resolveReportSourceFlags(filters: PaymentStatusFilters = {}): ReportSourceFlags {
  const bookingScoped = Boolean(filters.courtId || filters.sportId)
  const tipo = filters.tipo

  if (bookingScoped) {
    return {
      mode: 'booking_scoped',
      includeStationPayments: false,
      includeRotativoInscricoes: false,
      includeRotativoCreditos: false,
      includeTransactions: false,
    }
  }

  if (tipo === 'avulso') {
    return {
      mode: 'avulso',
      includeStationPayments: false,
      includeRotativoInscricoes: false,
      includeRotativoCreditos: false,
      includeTransactions: false,
    }
  }

  if (tipo === 'mensal') {
    return {
      mode: 'mensal',
      includeStationPayments: false,
      includeRotativoInscricoes: false,
      includeRotativoCreditos: false,
      includeTransactions: true,
    }
  }

  return {
    mode: 'full',
    includeStationPayments: true,
    includeRotativoInscricoes: true,
    includeRotativoCreditos: true,
    includeTransactions: true,
  }
}

/**
 * - Mensalista confirmado: só via transação Mensalidade (sessão não entra).
 * - Avulso reservado (não pago): não entra — cobrança fica no Financeiro.
 * - Avulso confirmado / mensalista reservado ou cancelado: entra no relatório.
 */
export function shouldIncludeBookingRow(booking: BookingLike): boolean {
  if (booking.plano_mensalista_id && booking.status === 'confirmed') return false
  if (!booking.plano_mensalista_id && booking.status !== 'confirmed') return false
  return true
}

export function getMirroredTransactionCategories(stationTypeNames: string[]): string[] {
  return [...SYSTEM_MIRRORED_TRANSACTION_CATEGORIES, ...stationTypeNames]
}

/**
 * Transações criadas automaticamente por comandas, rotativo ou reservas.
 * Lançamentos manuais no Financeiro usam a mesma categoria, mas descrição livre.
 */
export function isSystemGeneratedMirroredTransaction(
  category: string,
  description: string | null | undefined,
  stationTypeNames: string[]
): boolean {
  const desc = (description ?? '').trim()

  if (category === 'Reserva Avulsa' && desc.startsWith('Reserva Avulsa - ')) return true

  if (category === 'Rotativo') {
    if (desc.startsWith('Rotativo - ') || desc.startsWith('Crédito de rotativo - ')) return true
  }

  if (stationTypeNames.includes(category) && desc.includes(' - Comanda #')) return true

  return false
}

/**
 * Define se uma transação de entrada deve aparecer no relatório.
 * - full: todas as entradas manuais + Mensalidade; exclui só espelhos automáticos
 * - mensal: só Mensalidade
 */
export function shouldIncludeTransactionRow(
  category: string,
  description: string | null | undefined,
  mode: ReportQueryMode,
  stationTypeNames: string[]
): boolean {
  if (mode === 'avulso' || mode === 'booking_scoped') return false
  if (mode === 'mensal') return category === 'Mensalidade'

  return !isSystemGeneratedMirroredTransaction(category, description, stationTypeNames)
}
