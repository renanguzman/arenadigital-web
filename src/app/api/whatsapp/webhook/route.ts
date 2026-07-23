import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Json } from '@/types/supabase.types'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyMetaSignature, verifyWebhookHandshake } from '@/modules/ai-agent/lib/meta-signature'
import { parseInboundMessages } from '@/modules/ai-agent/lib/parse-inbound'
import { beginWebhookProcessing } from '@/modules/ai-agent/lib/webhook-events'
import { processInboundMessage } from '@/modules/ai-agent/usecases/process-inbound-message.usecase'

// crypto (assinatura) exige runtime Node.
export const runtime = 'nodejs'

/**
 * GET — handshake de verificação do webhook (Meta).
 * O Meta envia hub.mode, hub.verify_token e hub.challenge.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  try {
    const challenge = verifyWebhookHandshake({
      mode: params.get('hub.mode'),
      token: params.get('hub.verify_token'),
      challenge: params.get('hub.challenge'),
    })
    if (challenge === null) {
      return new NextResponse('Forbidden', { status: 403 })
    }
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  } catch (error) {
    console.error('[whatsapp-webhook] handshake error', error)
    return new NextResponse('Server misconfigured', { status: 500 })
  }
}

/**
 * POST — recebe mensagens. Verifica assinatura, registra idempotência,
 * responde 200 imediatamente e processa de forma assíncrona (after()).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  // 1) Verificação de assinatura (X-Hub-Signature-256).
  let valid = false
  try {
    valid = verifyMetaSignature(rawBody, signature)
  } catch (error) {
    console.error('[whatsapp-webhook] signature verification misconfigured', error)
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // 2) Parse do payload.
  let payload: Json | null = null
  try {
    payload = JSON.parse(rawBody) as Json
  } catch {
    // Payload inválido: nada a processar, mas responde 200 para não gerar retry.
    return NextResponse.json({ received: true })
  }

  const messages = parseInboundMessages(payload)
  if (messages.length === 0) {
    // Ex.: eventos de status de entrega — ignorados no MVP.
    return NextResponse.json({ received: true })
  }

  // 3) Idempotência + agendamento do processamento assíncrono.
  const supabase = getSupabaseAdmin()
  for (const message of messages) {
    try {
      const { id, shouldProcess } = await beginWebhookProcessing(supabase, {
        waMessageId: message.waMessageId,
        phoneNumberId: message.phoneNumberId,
        eventType: `message.${message.type}`,
        payload,
      })
      if (!shouldProcess) continue

      after(async () => {
        await processInboundMessage(message, id)
      })
    } catch (error) {
      console.error('[whatsapp-webhook] failed to register event', {
        waMessageId: message.waMessageId,
        error,
      })
    }
  }

  // 4) ACK imediato ao Meta.
  return NextResponse.json({ received: true })
}
