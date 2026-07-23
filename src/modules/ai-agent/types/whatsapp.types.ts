import type { MessageContentType } from './agent.types'

/** Mensagem de entrada já normalizada a partir do payload do Meta. */
export interface ParsedInboundMessage {
  waMessageId: string
  from: string // wa_id do contato
  phoneNumberId: string
  wabaId: string | null
  contactName: string | null
  type: MessageContentType
  text?: string
  audioMediaId?: string
  audioMimeType?: string
  timestamp?: string
}
