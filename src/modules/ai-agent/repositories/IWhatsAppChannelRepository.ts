import type {
  ConnectChannelInput,
  WhatsAppChannelPublic,
  WhatsAppChannelWithToken,
} from '../types/agent.types'

export interface IWhatsAppChannelRepository {
  /** Conecta/atualiza o canal da arena (cifra o token). Valida unicidade do número. */
  connect(input: ConnectChannelInput): Promise<WhatsAppChannelPublic>
  /** Visão pública do canal da arena (sem token). */
  getPublicByArenaId(arenaId: string): Promise<WhatsAppChannelPublic | null>
  /** Resolve o canal por phone_number_id, com token decifrado (rota de webhook/envio). */
  getWithTokenByPhoneNumberId(phoneNumberId: string): Promise<WhatsAppChannelWithToken | null>
  /** Marca o canal da arena como desconectado. */
  disconnect(arenaId: string): Promise<void>
  /** true se o número já pertence a OUTRA arena (viola "um número, uma conta"). */
  isPhoneNumberLinkedToAnotherArena(
    phoneNumberId: string,
    arenaId: string
  ): Promise<boolean>
  /** Atualiza o carimbo de última mensagem recebida. */
  touchLastInbound(channelId: string): Promise<void>
}
