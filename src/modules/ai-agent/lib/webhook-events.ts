import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/supabase.types'
import type { MessageStatus, WebhookEventStatus } from '../types/agent.types'
import type { ParsedStatusEvent } from './parse-inbound'

// Recibos do Meta → status da mensagem outbound. Ignoramos 'sent' (a mensagem
// já nasce 'sent'); só promovemos para delivered/failed para não regredir.
const STATUS_MAP: Record<string, MessageStatus> = {
  delivered: 'delivered',
  read: 'delivered',
  failed: 'failed',
}

export async function applyStatusEvents(
  client: SupabaseClient<Database>,
  statuses: ParsedStatusEvent[]
): Promise<void> {
  for (const s of statuses) {
    const mapped = STATUS_MAP[s.status]
    if (!mapped) continue
    const patch: Database['public']['Tables']['whatsapp_messages']['Update'] = { status: mapped }
    if (s.errorMessage) patch.error_message = s.errorMessage
    const { error } = await client
      .from('whatsapp_messages')
      .update(patch)
      .eq('wa_message_id', s.waMessageId)
    if (error) {
      console.error('[whatsapp-webhook] applyStatusEvents update failed', {
        waMessageId: s.waMessageId,
        error,
      })
    }
  }
}

// Idempotência de eventos do webhook do WhatsApp.
// Espelha o padrão de payment_webhook_events: dedupe por (provider, wa_message_id).

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
  )
}

export async function beginWebhookProcessing(
  client: SupabaseClient<Database>,
  input: {
    providerEventId?: string | null
    waMessageId: string
    phoneNumberId: string
    eventType: string
    payload: Json | null
  }
): Promise<{ id: string; shouldProcess: boolean }> {
  const now = new Date().toISOString()

  const { data, error } = await client
    .from('whatsapp_webhook_events')
    .insert({
      provider: 'meta',
      provider_event_id: input.providerEventId ?? null,
      wa_message_id: input.waMessageId,
      phone_number_id: input.phoneNumberId,
      event_type: input.eventType,
      status: 'processing',
      payload: input.payload,
      processing_started_at: now,
      updated_at: now,
    })
    .select('id')
    .single()

  if (!error && data) {
    return { id: data.id, shouldProcess: true }
  }

  // Duplicado: mensagem já vista → não reprocessar.
  if (isUniqueViolation(error)) {
    const { data: existing } = await client
      .from('whatsapp_webhook_events')
      .select('id')
      .eq('provider', 'meta')
      .eq('wa_message_id', input.waMessageId)
      .maybeSingle()
    return { id: existing?.id ?? '', shouldProcess: false }
  }

  throw error
}

export async function finishWebhookProcessing(
  client: SupabaseClient<Database>,
  input: {
    id: string
    status: Extract<WebhookEventStatus, 'processed' | 'ignored'>
    arenaId?: string | null
  }
): Promise<void> {
  if (!input.id) return
  const now = new Date().toISOString()
  const { error } = await client
    .from('whatsapp_webhook_events')
    .update({
      status: input.status,
      arena_id: input.arenaId ?? null,
      processed_at: now,
      updated_at: now,
    })
    .eq('id', input.id)

  if (error) {
    console.error('[whatsapp-webhook] Failed to finish event', { id: input.id, error })
  }
}

export async function failWebhookProcessing(
  client: SupabaseClient<Database>,
  input: { id: string; error: unknown }
): Promise<void> {
  if (!input.id) return
  const message = input.error instanceof Error ? input.error.message : String(input.error)
  const now = new Date().toISOString()
  const { error } = await client
    .from('whatsapp_webhook_events')
    .update({
      status: 'failed',
      error_message: message.slice(0, 2000),
      updated_at: now,
    })
    .eq('id', input.id)

  if (error) {
    console.error('[whatsapp-webhook] Failed to mark event as failed', { id: input.id, error })
  }
}
