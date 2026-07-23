import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase.types'
import { OpenAILLMProvider } from '../providers/llm/OpenAILLMProvider'
import type { ILLMProvider, LLMMessage } from '../providers/llm/ILLMProvider'
import { MetaWhatsAppClient } from '../providers/whatsapp/MetaWhatsAppClient'
import { MediaTooLargeError, type IWhatsAppClient } from '../providers/whatsapp/IWhatsAppClient'
import { SupabaseAgentDataRepository } from '../repositories/SupabaseAgentDataRepository'
import { SupabaseConversationRepository } from '../repositories/SupabaseConversationRepository'
import { AGENT_TOOL_DEFINITIONS, executeAgentTool } from '../tools/agent-tools'
import { buildSystemPrompt } from '../lib/system-prompt'
import { DEFAULT_FALLBACK_MESSAGE, type AgentConfig } from '../types/agent.types'
import type { WhatsAppChannelWithToken } from '../types/agent.types'
import type { ParsedInboundMessage } from '../types/whatsapp.types'

const MAX_TOOL_ROUNDS = 5
const AUDIO_BYTES_PER_SECOND = 2500 // ~16 kbps (opus voz) — proxy de duração

const RESEND_AS_TEXT =
  'Não consegui entender o áudio. Pode escrever sua dúvida em texto, por favor?'
const AUDIO_TOO_LONG =
  'Seu áudio é muito longo para eu processar. Pode resumir por texto ou enviar um áudio mais curto?'

function maxAudioBytes(): number {
  const seconds = Number(process.env.WHATSAPP_MAX_AUDIO_SECONDS ?? 120)
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 120
  return Math.round(safe * AUDIO_BYTES_PER_SECOND)
}

export interface GenerateAgentReplyInput {
  supabase: SupabaseClient<Database>
  arenaId: string
  agent: AgentConfig
  channel: WhatsAppChannelWithToken
  conversationId: string
  inbound: ParsedInboundMessage
  // Injeção para testes; defaults reais em produção.
  llm?: ILLMProvider
  whatsapp?: IWhatsAppClient
}

/**
 * Gera e envia a resposta do agente para uma mensagem de texto/áudio.
 * Transcreve áudio, monta o prompt (persona + guardrails), roda o loop de
 * tool calling contra as ferramentas escopadas por arena e envia via WhatsApp.
 * Registra as mensagens (inbound com transcrição, e outbound com custo).
 */
export async function generateAgentReply(input: GenerateAgentReplyInput): Promise<void> {
  const llm = input.llm ?? new OpenAILLMProvider()
  const whatsapp = input.whatsapp ?? new MetaWhatsAppClient()
  const conversationRepo = new SupabaseConversationRepository(input.supabase)
  const dataRepo = new SupabaseAgentDataRepository(input.supabase)

  // 1) Determinar o texto do usuário (transcrever se for áudio).
  let userText = ''
  let transcriptionModel: string | null = null
  let transcribedFromAudio = false

  if (input.inbound.type === 'audio' && input.inbound.audioMediaId) {
    try {
      const media = await whatsapp.downloadMedia({
        mediaId: input.inbound.audioMediaId,
        accessToken: input.channel.accessToken,
        maxBytes: maxAudioBytes(),
      })
      const transcription = await llm.transcribeAudio({
        audio: media.data,
        mimeType: media.mimeType || input.inbound.audioMimeType || 'audio/ogg',
        fileName: 'audio.ogg',
      })
      userText = transcription.text
      transcriptionModel = transcription.model
      transcribedFromAudio = true
    } catch (err) {
      if (err instanceof MediaTooLargeError) {
        await conversationRepo.recordMessage({
          conversationId: input.conversationId,
          arenaId: input.arenaId,
          direction: 'inbound',
          waMessageId: input.inbound.waMessageId,
          content: null,
          contentType: 'audio',
          mediaId: input.inbound.audioMediaId,
          status: 'received',
        })
        const sent = await whatsapp.sendText({
          phoneNumberId: input.channel.phoneNumberId,
          accessToken: input.channel.accessToken,
          toWaId: input.inbound.from,
          text: AUDIO_TOO_LONG,
        })
        await conversationRepo.recordMessage({
          conversationId: input.conversationId,
          arenaId: input.arenaId,
          direction: 'outbound',
          waMessageId: sent.waMessageId,
          content: AUDIO_TOO_LONG,
          contentType: 'text',
          status: 'sent',
        })
        return
      }
      throw err
    }
  } else {
    userText = input.inbound.text ?? ''
  }

  // 2) Buscar histórico ANTES de registrar a mensagem atual.
  const history = await conversationRepo.getRecentMessages(input.conversationId, 10)

  // 3) Registrar a mensagem de entrada (com a transcrição, se houver).
  await conversationRepo.recordMessage({
    conversationId: input.conversationId,
    arenaId: input.arenaId,
    direction: 'inbound',
    waMessageId: input.inbound.waMessageId,
    content: userText || null,
    contentType: input.inbound.type,
    transcribedFromAudio,
    mediaId: input.inbound.audioMediaId ?? null,
    transcriptionModel,
    status: 'received',
  })

  // 3.1) Áudio ilegível → pedir reenvio em texto.
  if (!userText.trim()) {
    const sent = await whatsapp.sendText({
      phoneNumberId: input.channel.phoneNumberId,
      accessToken: input.channel.accessToken,
      toWaId: input.inbound.from,
      text: RESEND_AS_TEXT,
    })
    await conversationRepo.recordMessage({
      conversationId: input.conversationId,
      arenaId: input.arenaId,
      direction: 'outbound',
      waMessageId: sent.waMessageId,
      content: RESEND_AS_TEXT,
      contentType: 'text',
      status: 'sent',
    })
    return
  }

  // 3.2) Teto mensal de tokens — se atingido, pausa o LLM e responde fallback.
  if (input.agent.monthlyTokenCap != null) {
    const usage = await conversationRepo.getMonthlyTokenUsage(input.arenaId)
    if (usage >= input.agent.monthlyTokenCap) {
      console.warn('[ai-agent] monthly token cap reached', {
        arenaId: input.arenaId,
        usage,
        cap: input.agent.monthlyTokenCap,
      })
      const capMessage =
        input.agent.fallbackMessage?.trim() || DEFAULT_FALLBACK_MESSAGE
      const sent = await whatsapp.sendText({
        phoneNumberId: input.channel.phoneNumberId,
        accessToken: input.channel.accessToken,
        toWaId: input.inbound.from,
        text: capMessage,
      })
      await conversationRepo.recordMessage({
        conversationId: input.conversationId,
        arenaId: input.arenaId,
        direction: 'outbound',
        waMessageId: sent.waMessageId,
        content: capMessage,
        contentType: 'text',
        status: 'sent',
      })
      return
    }
  }

  // 4) Montar as mensagens do LLM.
  const arena = await dataRepo.getArenaInfo(input.arenaId)
  const systemPrompt = buildSystemPrompt({
    arenaName: arena?.name ?? 'nossa arena',
    personaPrompt: input.agent.personaPrompt,
    fallbackMessage: input.agent.fallbackMessage,
  })

  const messages: LLMMessage[] = [{ role: 'system', content: systemPrompt }]
  for (const h of history) {
    if (!h.content) continue
    messages.push({
      role: h.direction === 'inbound' ? 'user' : 'assistant',
      content: h.content,
    })
  }
  messages.push({ role: 'user', content: userText })

  // 5) Loop de tool calling.
  const toolCtx = { data: dataRepo, arenaId: input.arenaId }
  let promptTokens = 0
  let completionTokens = 0
  let replyText: string | null = null

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const result = await llm.complete({
      model: input.agent.model,
      messages,
      tools: AGENT_TOOL_DEFINITIONS,
      temperature: input.agent.temperature,
      maxOutputTokens: input.agent.maxOutputTokens,
    })
    promptTokens += result.usage.promptTokens
    completionTokens += result.usage.completionTokens

    if (result.message.toolCalls?.length) {
      messages.push({
        role: 'assistant',
        content: result.message.content,
        toolCalls: result.message.toolCalls,
      })
      for (const call of result.message.toolCalls) {
        let toolResult: unknown
        try {
          toolResult = await executeAgentTool(call.name, call.arguments, toolCtx)
        } catch (err) {
          toolResult = { error: err instanceof Error ? err.message : 'tool error' }
        }
        messages.push({
          role: 'tool',
          toolCallId: call.id,
          content: JSON.stringify(toolResult),
        })
      }
      continue
    }

    replyText = result.message.content
    break
  }

  const finalText =
    replyText?.trim() || input.agent.fallbackMessage?.trim() || DEFAULT_FALLBACK_MESSAGE

  // 6) Enviar a resposta e registrar o outbound.
  const sent = await whatsapp.sendText({
    phoneNumberId: input.channel.phoneNumberId,
    accessToken: input.channel.accessToken,
    toWaId: input.inbound.from,
    text: finalText,
  })

  await conversationRepo.recordMessage({
    conversationId: input.conversationId,
    arenaId: input.arenaId,
    direction: 'outbound',
    waMessageId: sent.waMessageId,
    content: finalText,
    contentType: 'text',
    llmModel: input.agent.model,
    promptTokens,
    completionTokens,
    status: 'sent',
  })
}
