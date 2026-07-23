import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { LLMToolDefinition } from '../providers/llm/ILLMProvider'
import {
  SupabaseAgentDataRepository,
  type AgentBooking,
  type AgentCourt,
  type DayConfigEntry,
  type DayConfigTier,
} from '../repositories/SupabaseAgentDataRepository'

// Fuso fixo do Brasil (sem horário de verão desde 2019). As reservas são
// criadas em horário local, então ancoramos os cálculos em -03:00.
const BR_OFFSET = '-03:00'
const DEFAULT_SESSIONS_PER_MONTH = 4 // estimativa 1x/semana

export interface AgentToolContext {
  data: SupabaseAgentDataRepository
  arenaId: string
}

// ---------------------------------------------------------------------------
// Definições expostas ao LLM (JSON Schema)
// ---------------------------------------------------------------------------
export const AGENT_TOOL_DEFINITIONS: LLMToolDefinition[] = [
  {
    name: 'get_opening_hours',
    description: 'Retorna o horário de funcionamento da arena por dia da semana.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_courts',
    description:
      'Lista as quadras/espaços ativos da arena, com tipo, se é coberta e as modalidades. Pode filtrar por modalidade.',
    parameters: {
      type: 'object',
      properties: {
        sport: { type: 'string', description: 'Filtrar por modalidade (opcional).' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_pricing',
    description:
      'Retorna os valores de reserva avulsa (por hora, do banco) e uma estimativa de valor mensal. Pode filtrar por quadra ou modalidade.',
    parameters: {
      type: 'object',
      properties: {
        court: { type: 'string', description: 'Nome da quadra (opcional).' },
        sport: { type: 'string', description: 'Modalidade (opcional).' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'check_availability',
    description:
      'Verifica a disponibilidade das quadras em uma data (e opcionalmente horário). Cruza a grade da arena com as reservas existentes.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Data no formato AAAA-MM-DD.' },
        time: { type: 'string', description: 'Horário HH:MM (opcional).' },
        court: { type: 'string', description: 'Nome da quadra (opcional).' },
        sport: { type: 'string', description: 'Modalidade (opcional).' },
      },
      required: ['date'],
      additionalProperties: false,
    },
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase()
    .trim()
}

function matchesCourt(court: AgentCourt, filters: { court?: string; sport?: string }): boolean {
  // Busca tolerante: o modelo às vezes manda "areia"/"churrasqueira" como sport,
  // mas o termo está no nome/tipo do espaço. Casamos contra nome + tipo + modalidades.
  const terms = [filters.court, filters.sport]
    .filter((t): t is string => Boolean(t && t.trim()))
    .map(normalize)
  if (terms.length === 0) return true
  const haystack = [court.name, court.type ?? '', ...court.sports].map(normalize)
  return terms.every((term) => haystack.some((h) => h.includes(term)))
}

const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

// opening_hours pode vir com chaves numéricas 0..6 (0 = Domingo, padrão getDay()).
// Traduz para nomes de dia para o LLM não se confundir; mantém chaves não-numéricas.
function normalizeOpeningHours(oh: unknown): unknown {
  if (!oh || typeof oh !== 'object' || Array.isArray(oh)) return oh
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(oh as Record<string, unknown>)) {
    const idx = Number(key)
    const label =
      Number.isInteger(idx) && idx >= 0 && idx <= 6 ? WEEKDAY_NAMES[idx] : key
    out[label] = value
  }
  return out
}

function weekdayName(dateYmd: string): string {
  // Ancorar ao meio-dia para não escorregar de dia por fuso.
  const d = parseISO(`${dateYmd}T12:00:00${BR_OFFSET}`)
  const name = format(d, 'EEEE', { locale: ptBR })
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function findDayConfig(court: AgentCourt, dayName: string): DayConfigEntry | undefined {
  return court.dayConfig.find((d) => normalize(d.day) === normalize(dayName))
}

function tiersOf(entry: DayConfigEntry): DayConfigTier[] {
  if (entry.customPrices?.length) return entry.customPrices
  return [{ start: entry.startTime, end: entry.endTime, price: entry.price }]
}

function hourInSchedule(hour: number, startTime: string, endTime: string): boolean {
  const startH = parseInt(startTime.split(':')[0] ?? '0', 10)
  const endH = parseInt(endTime.split(':')[0] ?? '0', 10)
  if (startH < endH) return hour >= startH && hour < endH
  // Faixa que cruza a meia-noite.
  return hour >= startH || hour < endH
}

function isBooked(
  bookings: AgentBooking[],
  courtId: string,
  dateYmd: string,
  hour: number
): boolean {
  const hh = String(hour).padStart(2, '0')
  const slotStart = parseISO(`${dateYmd}T${hh}:00:00${BR_OFFSET}`).getTime()
  const slotEnd = parseISO(`${dateYmd}T${String(hour + 1).padStart(2, '0')}:00:00${BR_OFFSET}`).getTime()
  return bookings.some((b) => {
    if (b.courtId !== courtId) return false
    if (b.status === 'cancelled') return false
    const bStart = parseISO(b.startTime).getTime()
    const bEnd = parseISO(b.endTime).getTime()
    return bStart < slotEnd && bEnd > slotStart
  })
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------
export async function executeAgentTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AgentToolContext
): Promise<unknown> {
  switch (name) {
    case 'get_opening_hours': {
      const arena = await ctx.data.getArenaInfo(ctx.arenaId)
      return {
        arena: arena?.name ?? null,
        openingHours: normalizeOpeningHours(arena?.openingHours ?? null),
      }
    }

    case 'list_courts': {
      const sport = typeof args.sport === 'string' ? args.sport : undefined
      const courts = await ctx.data.getActiveCourts(ctx.arenaId)
      return {
        courts: courts
          .filter((c) => matchesCourt(c, { sport }))
          .map((c) => ({
            name: c.name,
            type: c.type,
            covered: c.isCovered,
            sports: c.sports,
          })),
      }
    }

    case 'get_pricing': {
      const court = typeof args.court === 'string' ? args.court : undefined
      const sport = typeof args.sport === 'string' ? args.sport : undefined
      const courts = await ctx.data.getActiveCourts(ctx.arenaId)
      const filtered = courts.filter((c) => matchesCourt(c, { court, sport }))
      // Rede de segurança: filtro sem resultado (ex.: modalidade errada do modelo)
      // → devolve todos os espaços em vez de vazio.
      const effective = filtered.length > 0 ? filtered : courts
      return {
        note:
          (filtered.length > 0
            ? ''
            : 'Nenhum espaço específico bateu com o filtro; segue a lista completa. ') +
          'Valores avulsos por hora vêm da configuração da arena. O valor mensal é uma ESTIMATIVA (preço/hora × sessões no mês) — confirmar com a arena.',
        courts: effective
          .map((c) => {
            const enabledDays = c.dayConfig.filter((d) => d.enabled)
            const basePrice = enabledDays[0]?.price ?? 0
            return {
              name: c.name,
              avulso: enabledDays.map((d) => ({
                day: d.day,
                tiers: tiersOf(d).map((t) => ({
                  from: t.start,
                  to: t.end,
                  price: t.price,
                })),
              })),
              estimatedMonthly: {
                sessionsPerMonth: DEFAULT_SESSIONS_PER_MONTH,
                value: Math.round(basePrice * DEFAULT_SESSIONS_PER_MONTH * 100) / 100,
                basis: `1x/semana (${DEFAULT_SESSIONS_PER_MONTH} sessões) sobre R$${basePrice}/h`,
              },
            }
          }),
      }
    }

    case 'check_availability': {
      const date = typeof args.date === 'string' ? args.date : undefined
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { error: 'Data inválida. Use o formato AAAA-MM-DD.' }
      }
      const time = typeof args.time === 'string' ? args.time : undefined
      const court = typeof args.court === 'string' ? args.court : undefined
      const sport = typeof args.sport === 'string' ? args.sport : undefined
      const targetHour = time ? parseInt(time.split(':')[0] ?? '', 10) : undefined

      const [courts, bookings] = await Promise.all([
        ctx.data.getActiveCourts(ctx.arenaId),
        ctx.data.getBookingsForRange(
          ctx.arenaId,
          `${date}T00:00:00${BR_OFFSET}`,
          `${date}T23:59:59${BR_OFFSET}`
        ),
      ])

      const dayName = weekdayName(date)
      const filtered = courts.filter((c) => matchesCourt(c, { court, sport }))
      // Rede de segurança: filtro sem resultado → considera todos os espaços.
      const effective = filtered.length > 0 ? filtered : courts

      const results = effective.map((c) => {
        const config = findDayConfig(c, dayName)
        if (!config || !config.enabled) {
          return { court: c.name, closed: true, availableHours: [] as string[] }
        }
        const startH = parseInt(config.startTime.split(':')[0] ?? '0', 10)
        const endH = parseInt(config.endTime.split(':')[0] ?? '0', 10)
        const hours: number[] = []
        for (let h = 0; h < 24; h++) {
          if (!hourInSchedule(h, config.startTime, config.endTime)) continue
          if (targetHour !== undefined && h !== targetHour) continue
          if (!isBooked(bookings, c.id, date, h)) hours.push(h)
        }
        return {
          court: c.name,
          closed: false,
          opensAt: config.startTime,
          closesAt: config.endTime,
          availableHours: hours.map((h) => `${String(h).padStart(2, '0')}:00`),
          scheduleWindow: `${String(startH).padStart(2, '0')}:00-${String(endH).padStart(2, '0')}:00`,
        }
      })

      return {
        date,
        weekday: dayName,
        requestedTime: time ?? null,
        note:
          filtered.length > 0
            ? undefined
            : 'Nenhum espaço específico bateu com o filtro; disponibilidade de todos os espaços abaixo.',
        courts: results,
      }
    }

    default:
      return { error: `Ferramenta desconhecida: ${name}` }
  }
}
