import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase.types'
import { decryptSecret, encryptSecret } from '../lib/crypto'
import type { IWhatsAppChannelRepository } from './IWhatsAppChannelRepository'
import type {
  ChannelStatus,
  ConnectChannelInput,
  WhatsAppChannelPublic,
  WhatsAppChannelRow,
  WhatsAppChannelWithToken,
} from '../types/agent.types'

function toPublic(row: WhatsAppChannelRow): WhatsAppChannelPublic {
  return {
    id: row.id,
    arenaId: row.arena_id,
    phoneNumberId: row.phone_number_id,
    wabaId: row.waba_id,
    displayPhoneNumber: row.display_phone_number,
    verifiedName: row.verified_name,
    status: (row.status as ChannelStatus) ?? 'pending',
    connectedAt: row.connected_at,
    lastInboundAt: row.last_inbound_at,
  }
}

export class SupabaseWhatsAppChannelRepository implements IWhatsAppChannelRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async connect(input: ConnectChannelInput): Promise<WhatsAppChannelPublic> {
    const takenByOther = await this.isPhoneNumberLinkedToAnotherArena(
      input.phoneNumberId,
      input.arenaId
    )
    if (takenByOther) {
      throw new Error(
        'Este número de WhatsApp já está vinculado a outra arena. Um número só pode pertencer a uma conta.'
      )
    }

    const now = new Date().toISOString()
    const payload = {
      arena_id: input.arenaId,
      provider: 'meta',
      phone_number_id: input.phoneNumberId,
      waba_id: input.wabaId,
      display_phone_number: input.displayPhoneNumber ?? null,
      verified_name: input.verifiedName ?? null,
      access_token_encrypted: encryptSecret(input.accessToken),
      token_expires_at: input.tokenExpiresAt ?? null,
      status: 'connected' as const,
      connected_at: now,
      updated_at: now,
    }

    const { data, error } = await this.client
      .from('whatsapp_channels')
      .upsert(payload, { onConflict: 'arena_id' })
      .select('*')
      .single()

    if (error) throw new Error(`SupabaseWhatsAppChannelRepository.connect: ${error.message}`)
    return toPublic(data)
  }

  async getPublicByArenaId(arenaId: string): Promise<WhatsAppChannelPublic | null> {
    const { data, error } = await this.client
      .from('whatsapp_channels')
      .select('*')
      .eq('arena_id', arenaId)
      .maybeSingle()

    if (error)
      throw new Error(`SupabaseWhatsAppChannelRepository.getPublicByArenaId: ${error.message}`)
    return data ? toPublic(data) : null
  }

  async getWithTokenByPhoneNumberId(
    phoneNumberId: string
  ): Promise<WhatsAppChannelWithToken | null> {
    const { data, error } = await this.client
      .from('whatsapp_channels')
      .select('*')
      .eq('phone_number_id', phoneNumberId)
      .maybeSingle()

    if (error)
      throw new Error(
        `SupabaseWhatsAppChannelRepository.getWithTokenByPhoneNumberId: ${error.message}`
      )
    if (!data) return null

    return { ...toPublic(data), accessToken: decryptSecret(data.access_token_encrypted) }
  }

  async disconnect(arenaId: string): Promise<void> {
    const { error } = await this.client
      .from('whatsapp_channels')
      .update({ status: 'disconnected', updated_at: new Date().toISOString() })
      .eq('arena_id', arenaId)

    if (error) throw new Error(`SupabaseWhatsAppChannelRepository.disconnect: ${error.message}`)
  }

  async isPhoneNumberLinkedToAnotherArena(
    phoneNumberId: string,
    arenaId: string
  ): Promise<boolean> {
    const { data, error } = await this.client
      .from('whatsapp_channels')
      .select('arena_id')
      .eq('phone_number_id', phoneNumberId)
      .neq('arena_id', arenaId)
      .maybeSingle()

    if (error)
      throw new Error(
        `SupabaseWhatsAppChannelRepository.isPhoneNumberLinkedToAnotherArena: ${error.message}`
      )
    return Boolean(data)
  }

  async touchLastInbound(channelId: string): Promise<void> {
    const { error } = await this.client
      .from('whatsapp_channels')
      .update({ last_inbound_at: new Date().toISOString() })
      .eq('id', channelId)

    if (error)
      throw new Error(`SupabaseWhatsAppChannelRepository.touchLastInbound: ${error.message}`)
  }
}
