import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase.types'
import type {
  MessageContentType,
  MessageDirection,
  MessageStatus,
  WhatsAppMessageRow,
} from '../types/agent.types'

export interface RecordMessageInput {
  conversationId: string
  arenaId: string
  direction: MessageDirection
  waMessageId?: string | null
  content: string | null
  contentType: MessageContentType
  transcribedFromAudio?: boolean
  mediaId?: string | null
  llmModel?: string | null
  transcriptionModel?: string | null
  promptTokens?: number | null
  completionTokens?: number | null
  audioSeconds?: number | null
  toolCalls?: unknown
  status: MessageStatus
  errorMessage?: string | null
}

export interface RecentMessage {
  direction: MessageDirection
  content: string | null
}

export class SupabaseConversationRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  /** Cria (ou reaproveita) a conversa do contato na arena e retorna o id. */
  async upsertConversation(input: {
    arenaId: string
    channelId: string | null
    contactWaId: string
    contactName: string | null
  }): Promise<string> {
    const now = new Date().toISOString()
    const { data, error } = await this.client
      .from('whatsapp_conversations')
      .upsert(
        {
          arena_id: input.arenaId,
          channel_id: input.channelId,
          contact_wa_id: input.contactWaId,
          contact_name: input.contactName,
          last_message_at: now,
          status: 'open',
          updated_at: now,
        },
        { onConflict: 'arena_id,contact_wa_id' }
      )
      .select('id')
      .single()

    if (error)
      throw new Error(`SupabaseConversationRepository.upsertConversation: ${error.message}`)
    return data.id
  }

  async recordMessage(input: RecordMessageInput): Promise<WhatsAppMessageRow> {
    const { data, error } = await this.client
      .from('whatsapp_messages')
      .insert({
        conversation_id: input.conversationId,
        arena_id: input.arenaId,
        direction: input.direction,
        wa_message_id: input.waMessageId ?? null,
        content: input.content,
        content_type: input.contentType,
        transcribed_from_audio: input.transcribedFromAudio ?? false,
        media_id: input.mediaId ?? null,
        llm_model: input.llmModel ?? null,
        transcription_model: input.transcriptionModel ?? null,
        prompt_tokens: input.promptTokens ?? null,
        completion_tokens: input.completionTokens ?? null,
        audio_seconds: input.audioSeconds ?? null,
        tool_calls: (input.toolCalls ?? null) as never,
        status: input.status,
        error_message: input.errorMessage ?? null,
      })
      .select('*')
      .single()

    if (error) throw new Error(`SupabaseConversationRepository.recordMessage: ${error.message}`)
    return data
  }

  /** Soma de tokens (prompt + completion) consumidos pela arena no mês corrente (fuso BR). */
  async getMonthlyTokenUsage(arenaId: string): Promise<number> {
    const now = new Date(Date.now() - 3 * 60 * 60 * 1000) // aproxima horário BR (UTC-3)
    const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01T00:00:00-03:00`

    const { data, error } = await this.client
      .from('whatsapp_messages')
      .select('prompt_tokens, completion_tokens')
      .eq('arena_id', arenaId)
      .gte('created_at', monthStart)

    if (error)
      throw new Error(`SupabaseConversationRepository.getMonthlyTokenUsage: ${error.message}`)

    return (data ?? []).reduce(
      (sum, m) => sum + (m.prompt_tokens ?? 0) + (m.completion_tokens ?? 0),
      0
    )
  }

  /** Últimas mensagens da conversa (para montar o contexto do LLM). */
  async getRecentMessages(conversationId: string, limit = 10): Promise<RecentMessage[]> {
    const { data, error } = await this.client
      .from('whatsapp_messages')
      .select('direction, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error)
      throw new Error(`SupabaseConversationRepository.getRecentMessages: ${error.message}`)

    return (data ?? [])
      .reverse()
      .map((m) => ({ direction: m.direction as MessageDirection, content: m.content }))
  }
}
