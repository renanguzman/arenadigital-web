import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// Cifra de segredos em nível de aplicação (AES-256-GCM).
// Usada para proteger o token de acesso do WhatsApp por arena, já que o RLS
// do projeto é permissivo. A chave vem de AI_AGENT_ENCRYPTION_KEY (qualquer
// string forte — é normalizada para 32 bytes via SHA-256).
//
// Formato do texto cifrado: "v1:<iv b64>:<authTag b64>:<ciphertext b64>".

const ALGORITHM = 'aes-256-gcm'
const VERSION = 'v1'
const IV_BYTES = 12

function getKey(): Buffer {
  const raw = process.env.AI_AGENT_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('Missing AI_AGENT_ENCRYPTION_KEY environment variable')
  }
  return createHash('sha256').update(raw, 'utf8').digest()
}

export function encryptSecret(plainText: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [
    VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(':')
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Invalid encrypted secret format')
  }
  const [, ivB64, authTagB64, dataB64] = parts
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}
