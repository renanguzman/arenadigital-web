import type { Database } from '@/types/supabase.types'

// ---------------------------------------------------------------------------
// Linhas geradas do Supabase (fonte da verdade dos tipos)
// ---------------------------------------------------------------------------
export type AgentConfigRow = Database['public']['Tables']['arena_ai_agents']['Row']
export type AgentConfigInsert = Database['public']['Tables']['arena_ai_agents']['Insert']
export type AgentConfigUpdate = Database['public']['Tables']['arena_ai_agents']['Update']

export type WhatsAppChannelRow = Database['public']['Tables']['whatsapp_channels']['Row']
export type WhatsAppChannelInsert = Database['public']['Tables']['whatsapp_channels']['Insert']
export type WhatsAppChannelUpdate = Database['public']['Tables']['whatsapp_channels']['Update']

export type WhatsAppConversationRow = Database['public']['Tables']['whatsapp_conversations']['Row']
export type WhatsAppMessageRow = Database['public']['Tables']['whatsapp_messages']['Row']
export type WhatsAppMessageInsert = Database['public']['Tables']['whatsapp_messages']['Insert']

export type WhatsAppWebhookEventRow = Database['public']['Tables']['whatsapp_webhook_events']['Row']
export type WhatsAppWebhookEventInsert =
  Database['public']['Tables']['whatsapp_webhook_events']['Insert']

// ---------------------------------------------------------------------------
// Enums / uniões
// ---------------------------------------------------------------------------
export type AgentStatus = 'draft' | 'active' | 'paused'
export type ChannelStatus = 'pending' | 'connected' | 'error' | 'disconnected'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageContentType = 'text' | 'audio' | 'unsupported'
export type MessageStatus = 'received' | 'sent' | 'delivered' | 'failed'
export type WebhookEventStatus = 'processing' | 'processed' | 'failed' | 'ignored'

// ---------------------------------------------------------------------------
// Modelos de domínio expostos à aplicação (sem segredos)
// ---------------------------------------------------------------------------
export interface AgentConfig {
  arenaId: string
  enabled: boolean
  personaPrompt: string | null
  model: string
  temperature: number
  maxOutputTokens: number
  monthlyTokenCap: number | null
  fallbackMessage: string | null
  status: AgentStatus
  updatedAt: string | null
}

/** Visão do canal para a UI/gestor — nunca inclui o token de acesso. */
export interface WhatsAppChannelPublic {
  id: string
  arenaId: string
  phoneNumberId: string
  wabaId: string
  displayPhoneNumber: string | null
  verifiedName: string | null
  status: ChannelStatus
  connectedAt: string | null
  lastInboundAt: string | null
}

/** Dados necessários para responder pelo canal (uso interno no servidor). */
export interface WhatsAppChannelWithToken extends WhatsAppChannelPublic {
  accessToken: string
}

export interface UpdateAgentConfigInput {
  personaPrompt?: string | null
  model?: string
  temperature?: number
  maxOutputTokens?: number
  monthlyTokenCap?: number | null
  fallbackMessage?: string | null
}

export interface ConnectChannelInput {
  arenaId: string
  phoneNumberId: string
  wabaId: string
  displayPhoneNumber?: string | null
  verifiedName?: string | null
  /** Token em texto puro — será cifrado antes de persistir. */
  accessToken: string
  tokenExpiresAt?: string | null
}

export const DEFAULT_AGENT_MODEL = 'gpt-4o-mini'
export const DEFAULT_FALLBACK_MESSAGE =
  'Desculpe, ainda não consigo ajudar com isso por aqui. Posso te passar para um atendente da arena.'
