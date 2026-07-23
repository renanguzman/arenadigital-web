// Abstração do provedor de WhatsApp (Meta Cloud API por padrão).

export interface SendTextInput {
  phoneNumberId: string
  accessToken: string
  toWaId: string
  text: string
}

export interface SendTextResult {
  waMessageId: string | null
}

export interface DownloadMediaInput {
  mediaId: string
  accessToken: string
  /** Se informado e o file_size da mídia exceder, lança MediaTooLargeError. */
  maxBytes?: number
}

/** Erro sinalizando que a mídia excede o limite configurado (ex.: áudio longo). */
export class MediaTooLargeError extends Error {
  readonly fileSize: number
  readonly maxBytes: number
  constructor(fileSize: number, maxBytes: number) {
    super(`Media too large: ${fileSize} > ${maxBytes}`)
    this.name = 'MediaTooLargeError'
    this.fileSize = fileSize
    this.maxBytes = maxBytes
  }
}

export interface DownloadMediaResult {
  data: Buffer
  mimeType: string
}

export interface SubscribeAppInput {
  wabaId: string
  accessToken: string
}

export interface IWhatsAppClient {
  sendText(input: SendTextInput): Promise<SendTextResult>
  downloadMedia(input: DownloadMediaInput): Promise<DownloadMediaResult>
  /** Inscreve o app do token na WABA para receber os webhooks de mensagens. */
  subscribeAppToWaba(input: SubscribeAppInput): Promise<void>
}
