"use server"

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { assertArenaBackofficeAccess } from '@/lib/server-auth'
import type {
  PaymentStatusRow,
  PaymentStatusSummary,
  CourtFilter,
  SportFilter,
  PaymentStatusFilters,
} from '@/modules/reports/types/report.types'

export async function getPaymentStatusReportAction(
  arenaId: string,
  filters: PaymentStatusFilters = {}
): Promise<{
  success: boolean
  rows?: PaymentStatusRow[]
  summary?: PaymentStatusSummary
  courts?: CourtFilter[]
  sports?: SportFilter[]
  error?: string
}> {
  try {
    await assertArenaBackofficeAccess(arenaId)
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('bookings')
      .select('id, start_time, status, price, plano_mensalista_id, sport_id, courts(id, name), sports(id, name), atleta:athlete_id(id, nome_perfil)')
      .eq('arena_id', arenaId)
      .order('start_time', { ascending: false })

    if (filters.startDate) query = query.gte('start_time', filters.startDate)
    if (filters.endDate) query = query.lte('start_time', filters.endDate + 'T23:59:59')
    if (filters.courtId) query = query.eq('court_id', filters.courtId)
    if (filters.sportId) query = query.eq('sport_id', filters.sportId)
    if (filters.tipo === 'avulso') query = query.is('plano_mensalista_id', null)
    if (filters.tipo === 'mensal') query = query.not('plano_mensalista_id', 'is', null)

    const includeStationPayments =
      !filters.courtId && !filters.sportId && (!filters.tipo || filters.tipo === 'todos')

    let stationPaymentsQuery = supabase
      .from('station_payments')
      .select(`
        id,
        amount,
        payment_method,
        paid_by_name,
        created_at,
        station_orders!inner(
          arena_id,
          order_number,
          status,
          customer_name,
          atleta:atleta(nome_perfil),
          station:stations(name, station_type:station_types(name))
        )
      `)
      .eq('station_orders.arena_id', arenaId)
      .order('created_at', { ascending: false })

    if (filters.startDate) stationPaymentsQuery = stationPaymentsQuery.gte('created_at', filters.startDate)
    if (filters.endDate) stationPaymentsQuery = stationPaymentsQuery.lte('created_at', filters.endDate + 'T23:59:59')

    const [bookingsResult, courtsResult, sportsResult, stationPaymentsResult] = await Promise.all([
      query,
      supabase.from('courts').select('id, name').eq('arena_id', arenaId).order('name'),
      supabase
        .from('court_sports')
        .select('sports(id, name)')
        .in('court_id',
          (await supabase.from('courts').select('id').eq('arena_id', arenaId)).data?.map(c => c.id) ?? []
        ),
      includeStationPayments ? stationPaymentsQuery : Promise.resolve({ data: [], error: null }),
    ])

    if (bookingsResult.error) throw new Error(bookingsResult.error.message)
    if (stationPaymentsResult.error) throw new Error(stationPaymentsResult.error.message)

    const bookingRows: PaymentStatusRow[] = (bookingsResult.data ?? []).map((b: any) => {
      let status: PaymentStatusRow['status'] = 'Pendente'
      if (b.status === 'confirmed') status = 'Pago'
      else if (b.status === 'cancelled') status = 'Cancelado'

      return {
        id: b.id,
        data: b.start_time,
        atleta: b.atleta?.nome_perfil ?? null,
        servico: b.plano_mensalista_id ? 'Mensal' : 'Avulso',
        espaco: b.courts?.name ?? null,
        esporte: b.sports?.name ?? null,
        valor: b.price ?? null,
        status,
      }
    })

    const stationPaymentRows: PaymentStatusRow[] = (stationPaymentsResult.data ?? []).map((payment: any) => {
      const order = payment.station_orders
      const station = order?.station
      const stationTypeName = station?.station_type?.name ?? null

      let status: PaymentStatusRow['status'] = 'Pago'
      if (order?.status === 'cancelled') status = 'Cancelado'

      return {
        id: `station-payment-${payment.id}`,
        data: payment.created_at,
        atleta: payment.paid_by_name ?? order?.atleta?.nome_perfil ?? order?.customer_name ?? null,
        servico: 'Comanda',
        espaco: station?.name ?? stationTypeName,
        esporte: payment.payment_method ?? null,
        valor: payment.amount ?? null,
        status,
      }
    })

    const rows: PaymentStatusRow[] = [...bookingRows, ...stationPaymentRows].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    )

    const summary: PaymentStatusSummary = rows.reduce(
      (acc, r) => {
        if (r.status === 'Pago') {
          acc.totalPago += r.valor ?? 0
          acc.countPago++
        } else if (r.status === 'Pendente') {
          acc.totalPendente += r.valor ?? 0
          acc.countPendente++
        } else if (r.status === 'Cancelado') {
          acc.totalCancelado += r.valor ?? 0
          acc.countCancelado++
        }
        return acc
      },
      { totalPago: 0, totalPendente: 0, totalCancelado: 0, countPago: 0, countPendente: 0, countCancelado: 0 }
    )

    const courts: CourtFilter[] = courtsResult.data ?? []

    const sportsMap = new Map<string, SportFilter>()
    for (const item of sportsResult.data ?? []) {
      const s = Array.isArray(item.sports) ? item.sports[0] : item.sports
      if (s?.id) sportsMap.set(s.id, { id: s.id, name: s.name })
    }
    const sports: SportFilter[] = [...sportsMap.values()]

    return { success: true, rows, summary, courts, sports }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar relatório'
    return { success: false, error: message }
  }
}
