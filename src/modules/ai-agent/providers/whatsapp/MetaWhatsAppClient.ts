import {
  MediaTooLargeError,
  type DownloadMediaInput,
  type DownloadMediaResult,
  type IWhatsAppClient,
  type SendTextInput,
  type SendTextResult,
} from './IWhatsAppClient'

// Implementação da Meta WhatsApp Business Cloud API via Graph API (REST).

const DEFAULT_GRAPH_VERSION = 'v21.0'

function graphBaseUrl(): string {
  const version = process.env.META_GRAPH_API_VERSION ?? DEFAULT_GRAPH_VERSION
  return `https://graph.facebook.com/${version}`
}

export class MetaWhatsAppClient implements IWhatsAppClient {
  async sendText(input: SendTextInput): Promise<SendTextResult> {
    const response = await fetch(`${graphBaseUrl()}/${input.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: input.toWaId,
        type: 'text',
        text: { preview_url: false, body: input.text },
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`Meta sendText error ${response.status}: ${detail.slice(0, 500)}`)
    }

    const json = (await response.json()) as { messages?: Array<{ id?: string }> }
    return { waMessageId: json.messages?.[0]?.id ?? null }
  }

  async downloadMedia(input: DownloadMediaInput): Promise<DownloadMediaResult> {
    // 1) Resolver a URL temporária da mídia a partir do media_id.
    const metaResponse = await fetch(`${graphBaseUrl()}/${input.mediaId}`, {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    })
    if (!metaResponse.ok) {
      const detail = await metaResponse.text()
      throw new Error(`Meta media lookup error ${metaResponse.status}: ${detail.slice(0, 300)}`)
    }
    const meta = (await metaResponse.json()) as {
      url?: string
      mime_type?: string
      file_size?: number
    }
    if (!meta.url) throw new Error('Meta media lookup error: missing url')

    // Guarda de tamanho (proxy de duração) antes de baixar o binário.
    if (input.maxBytes && typeof meta.file_size === 'number' && meta.file_size > input.maxBytes) {
      throw new MediaTooLargeError(meta.file_size, input.maxBytes)
    }

    // 2) Baixar o binário (a URL do CDN também exige o Bearer token).
    const binResponse = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    })
    if (!binResponse.ok) {
      const detail = await binResponse.text()
      throw new Error(`Meta media download error ${binResponse.status}: ${detail.slice(0, 300)}`)
    }

    const arrayBuffer = await binResponse.arrayBuffer()
    const mimeType =
      meta.mime_type ?? binResponse.headers.get('content-type') ?? 'application/octet-stream'
    return { data: Buffer.from(arrayBuffer), mimeType }
  }
}
