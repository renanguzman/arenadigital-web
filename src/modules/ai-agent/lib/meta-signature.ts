import { createHmac, timingSafeEqual } from 'node:crypto'

// Verificação da assinatura dos webhooks do Meta (X-Hub-Signature-256).
// O Meta assina o corpo bruto com HMAC-SHA256 usando o App Secret.
// Ver: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#validating-payloads

export function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) {
    throw new Error('Missing META_APP_SECRET environment variable')
  }
  if (!signatureHeader) return false

  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')

  const received = Buffer.from(signatureHeader)
  const computed = Buffer.from(expected)
  if (received.length !== computed.length) return false
  return timingSafeEqual(received, computed)
}

// Handshake de verificação do webhook (GET). O Meta envia hub.verify_token
// e espera de volta o hub.challenge quando o token confere.
export function verifyWebhookHandshake(params: {
  mode: string | null
  token: string | null
  challenge: string | null
}): string | null {
  const verifyToken = process.env.META_WHATSAPP_VERIFY_TOKEN
  if (!verifyToken) {
    throw new Error('Missing META_WHATSAPP_VERIFY_TOKEN environment variable')
  }
  if (params.mode === 'subscribe' && params.token === verifyToken) {
    return params.challenge ?? ''
  }
  return null
}
