import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/supabase.types'

// Repositório de leitura (escopo por arena) que alimenta as ferramentas do agente.
// TODAS as consultas recebem arenaId fixo do canal — o LLM nunca fornece arena.

export interface DayConfigTier {
  start: string
  end: string
  price: number
}

export interface DayConfigEntry {
  day: string
  enabled: boolean
  startTime: string
  endTime: string
  price: number
  customPrices?: DayConfigTier[]
}

export interface AgentCourt {
  id: string
  name: string
  type: string | null
  isCovered: boolean | null
  sports: string[]
  dayConfig: DayConfigEntry[]
}

export interface AgentBooking {
  courtId: string
  startTime: string
  endTime: string
  status: string | null
  bookingType: string | null
}

export interface AgentArenaInfo {
  name: string
  openingHours: Json | null
}

interface CourtRow {
  id: string
  name: string
  type: string | null
  is_covered: boolean | null
  status: string | null
  day_config: Json | null
  sports?: Array<{ sport: { id: string; name: string } | null }> | null
}

function parseDayConfig(raw: Json | null): DayConfigEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((e): e is Record<string, Json> => Boolean(e) && typeof e === 'object')
    .map((e) => ({
      day: String(e.day ?? ''),
      enabled: Boolean(e.enabled),
      startTime: String(e.startTime ?? ''),
      endTime: String(e.endTime ?? ''),
      price: Number(e.price ?? 0),
      customPrices: Array.isArray(e.customPrices)
        ? (e.customPrices as Array<Record<string, Json>>).map((t) => ({
            start: String(t.start ?? ''),
            end: String(t.end ?? ''),
            price: Number(t.price ?? 0),
          }))
        : undefined,
    }))
}

export class SupabaseAgentDataRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getArenaInfo(arenaId: string): Promise<AgentArenaInfo | null> {
    const { data, error } = await this.client
      .from('arenas')
      .select('name, opening_hours')
      .eq('id', arenaId)
      .maybeSingle()

    if (error) throw new Error(`SupabaseAgentDataRepository.getArenaInfo: ${error.message}`)
    if (!data) return null
    return { name: data.name, openingHours: data.opening_hours ?? null }
  }

  async getActiveCourts(arenaId: string): Promise<AgentCourt[]> {
    const { data, error } = await this.client
      .from('courts')
      .select('id, name, type, is_covered, status, day_config, sports:court_sports(sport:sports(id, name))')
      .eq('arena_id', arenaId)

    if (error) throw new Error(`SupabaseAgentDataRepository.getActiveCourts: ${error.message}`)

    return (data as CourtRow[] | null ?? [])
      .filter((c) => (c.status ?? '').toLowerCase() === 'ativo')
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        isCovered: c.is_covered,
        sports: (c.sports ?? []).flatMap((r) => (r.sport ? [r.sport.name] : [])),
        dayConfig: parseDayConfig(c.day_config),
      }))
  }

  async getBookingsForRange(
    arenaId: string,
    startIso: string,
    endIso: string
  ): Promise<AgentBooking[]> {
    const { data, error } = await this.client
      .from('bookings')
      .select('court_id, start_time, end_time, status, booking_type')
      .eq('arena_id', arenaId)
      .gte('start_time', startIso)
      .lte('start_time', endIso)

    if (error) throw new Error(`SupabaseAgentDataRepository.getBookingsForRange: ${error.message}`)

    return (data ?? []).map((b) => ({
      courtId: b.court_id,
      startTime: b.start_time,
      endTime: b.end_time,
      status: b.status,
      bookingType: b.booking_type,
    }))
  }
}
