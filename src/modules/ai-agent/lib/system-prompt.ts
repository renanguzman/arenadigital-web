import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DEFAULT_FALLBACK_MESSAGE } from '../types/agent.types'

// Fuso do Brasil (UTC-3) para contextualizar "hoje/agora" ao modelo.
const BR_OFFSET_MS = -3 * 60 * 60 * 1000

function nowInBrazil(): Date {
  return new Date(Date.now() + BR_OFFSET_MS)
}

export interface SystemPromptInput {
  arenaName: string
  personaPrompt: string | null
  fallbackMessage: string | null
}

export function buildSystemPrompt(input: SystemPromptInput): string {
  const now = nowInBrazil()
  const hoje = format(now, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  const hora = format(now, 'HH:mm', { locale: ptBR })
  const fallback = input.fallbackMessage?.trim() || DEFAULT_FALLBACK_MESSAGE

  const base = [
    `Você é o atendente virtual da arena esportiva "${input.arenaName}" no WhatsApp.`,
    `Data e hora atuais (Brasil): ${hoje}, ${hora}.`,
    '',
    'REGRAS:',
    `- Fale somente sobre a arena "${input.arenaName}". Nunca fale de outra arena.`,
    '- Responda apenas com base nas ferramentas disponíveis. NUNCA invente horários, preços ou disponibilidade.',
    '- SEMPRE consulte as ferramentas (list_courts, get_pricing, check_availability) antes de responder sobre espaços, preços ou disponibilidade. Não responda de cabeça.',
    '- Quadras, espaços sociais, churrasqueiras, salas (ex.: pilates) e similares fazem parte do escopo — trate todos como espaços da arena.',
    '- Ao filtrar por um espaço específico, use no parâmetro o próprio termo citado pelo cliente (ex.: "areia", "churrasqueira", "pilates"). NÃO adivinhe modalidade/esporte.',
    '- Se, mesmo consultando as ferramentas, não houver informação útil, responda educadamente: ' +
      `"${fallback}"`,
    '- Você NÃO efetua reservas nem cobranças. Para fechar uma reserva, oriente o cliente a procurar a arena.',
    '- Para saber disponibilidade, sempre use a ferramenta check_availability com a data no formato AAAA-MM-DD.',
    '- Ao citar preço mensal, deixe claro que é uma estimativa a confirmar com a arena.',
    '- Seja breve, cordial e use português do Brasil. Respostas curtas, adequadas ao WhatsApp.',
  ].join('\n')

  const persona = input.personaPrompt?.trim()
  if (persona) {
    return `${base}\n\nPERSONALIDADE E TOM (definidos pela arena):\n${persona}`
  }
  return base
}
