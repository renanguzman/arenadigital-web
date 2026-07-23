import { getSupabaseAdmin } from '@/lib/supabase-server'
import { MetaWhatsAppClient } from '../providers/whatsapp/MetaWhatsAppClient'
import { SupabaseAgentRepository } from '../repositories/SupabaseAgentRepository'
import { SupabaseConversationRepository } from '../repositories/SupabaseConversationRepository'
import { SupabaseWhatsAppChannelRepository } from '../repositories/SupabaseWhatsAppChannelRepository'
import { finishWebhookProcessing, failWebhookProcessing } from '../lib/webhook-events'
import { hasActiveArenaSubscription } from './is-agent-active.usecase'
import { generateAgentReply } from './generate-agent-reply.usecase'
import type { ParsedInboundMessage } from '../types/whatsapp.types'

const UNSUPPORTED_REPLY =
  'No momento eu consigo entender apenas mensagens de texto e de áudio. Pode me mandar sua dúvida por texto ou áudio?'

/**
 * Orquestra o processamento de uma mensagem recebida (executado de forma
 * assíncrona após o ACK do webhook). Responsável por: rotear para a arena,
 * aplicar os gates (agente ligado + assinatura), persistir a conversa e
 * finalizar o evento de idempotência.
 *
 * A geração da RESPOSTA via LLM (texto/áudio) é a Fase 4 — ver seam abaixo.
 */
export async function processInboundMessage(
  message: ParsedInboundMessage,
  eventId: string
): Promise<void> {
  const supabase = getSupabaseAdmin()

  try {
    // 1) Roteamento por phone_number_id (isolamento por arena).
    const channelRepo = new SupabaseWhatsAppChannelRepository(supabase)
    const channel = await channelRepo.getWithTokenByPhoneNumberId(message.phoneNumberId)

    if (!channel || channel.status !== 'connected') {
      await finishWebhookProcessing(supabase, { id: eventId, status: 'ignored' })
      return
    }

    // 2) Gates: agente ligado + assinatura utilizável.
    const agentRepo = new SupabaseAgentRepository(supabase)
    const agent = await agentRepo.getByArenaId(channel.arenaId)
    const subscriptionOk = await hasActiveArenaSubscription(supabase, channel.arenaId)

    if (!agent?.enabled || !subscriptionOk) {
      await finishWebhookProcessing(supabase, {
        id: eventId,
        status: 'ignored',
        arenaId: channel.arenaId,
      })
      return
    }

    // 3) Conversa + carimbo de última entrada.
    const conversationRepo = new SupabaseConversationRepository(supabase)
    const conversationId = await conversationRepo.upsertConversation({
      arenaId: channel.arenaId,
      channelId: channel.id,
      contactWaId: message.from,
      contactName: message.contactName,
    })
    await channelRepo.touchLastInbound(channel.id)

    // 4) Tipo não suportado (imagem/vídeo/etc.) → resposta padrão.
    if (message.type === 'unsupported') {
      const client = new MetaWhatsAppClient()
      await conversationRepo.recordMessage({
        conversationId,
        arenaId: channel.arenaId,
        direction: 'inbound',
        waMessageId: message.waMessageId,
        content: null,
        contentType: 'unsupported',
        mediaId: message.audioMediaId ?? null,
        status: 'received',
      })
      const sent = await client.sendText({
        phoneNumberId: channel.phoneNumberId,
        accessToken: channel.accessToken,
        toWaId: message.from,
        text: UNSUPPORTED_REPLY,
      })
      await conversationRepo.recordMessage({
        conversationId,
        arenaId: channel.arenaId,
        direction: 'outbound',
        waMessageId: sent.waMessageId,
        content: UNSUPPORTED_REPLY,
        contentType: 'text',
        status: 'sent',
      })
      await finishWebhookProcessing(supabase, {
        id: eventId,
        status: 'processed',
        arenaId: channel.arenaId,
      })
      return
    }

    // 5) Texto/áudio → geração da resposta via LLM (transcrição + ferramentas).
    await generateAgentReply({
      supabase,
      arenaId: channel.arenaId,
      agent,
      channel,
      conversationId,
      inbound: message,
    })

    await finishWebhookProcessing(supabase, {
      id: eventId,
      status: 'processed',
      arenaId: channel.arenaId,
    })
  } catch (error) {
    await failWebhookProcessing(supabase, { id: eventId, error })
    console.error('[whatsapp-webhook] processInboundMessage failed', {
      waMessageId: message.waMessageId,
      error,
    })
  }
}
