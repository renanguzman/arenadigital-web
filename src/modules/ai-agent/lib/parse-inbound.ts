import type { ParsedInboundMessage } from '../types/whatsapp.types'
import type { MessageContentType } from '../types/agent.types'

// Extrai as mensagens de entrada do payload de webhook do Meta.
// Estrutura: entry[].changes[].value.{ metadata, contacts, messages }.
// Ignora eventos que não sejam mensagens (ex.: status de entrega).

interface MetaMessage {
  id?: string
  from?: string
  type?: string
  timestamp?: string
  text?: { body?: string }
  audio?: { id?: string; mime_type?: string; voice?: boolean }
}

interface MetaValue {
  metadata?: { phone_number_id?: string; display_phone_number?: string }
  contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>
  messages?: MetaMessage[]
}

interface MetaChange {
  value?: MetaValue
  field?: string
}

interface MetaEntry {
  id?: string
  changes?: MetaChange[]
}

interface MetaWebhookPayload {
  object?: string
  entry?: MetaEntry[]
}

function mapType(type: string | undefined): MessageContentType {
  if (type === 'text') return 'text'
  if (type === 'audio') return 'audio'
  return 'unsupported'
}

export function parseInboundMessages(payload: unknown): ParsedInboundMessage[] {
  const body = payload as MetaWebhookPayload
  const result: ParsedInboundMessage[] = []

  for (const entry of body.entry ?? []) {
    const wabaId = entry.id ?? null
    for (const change of entry.changes ?? []) {
      const value = change.value
      if (!value?.messages?.length) continue

      const phoneNumberId = value.metadata?.phone_number_id
      if (!phoneNumberId) continue

      const contactName = value.contacts?.[0]?.profile?.name ?? null

      for (const message of value.messages) {
        if (!message.id || !message.from) continue
        const type = mapType(message.type)
        result.push({
          waMessageId: message.id,
          from: message.from,
          phoneNumberId,
          wabaId,
          contactName,
          type,
          text: type === 'text' ? message.text?.body : undefined,
          audioMediaId: type === 'audio' ? message.audio?.id : undefined,
          audioMimeType: type === 'audio' ? message.audio?.mime_type : undefined,
          timestamp: message.timestamp,
        })
      }
    }
  }

  return result
}
