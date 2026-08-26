import { randomBytes, randomUUID, createCipheriv, createDecipheriv, createHash, scryptSync } from 'node:crypto'
import type { ZodType } from 'zod'

// AES-256-GCM credential encryption. Node-only — never import this from a
// Client Component. Wire format: v1.<keyId>.<iv>.<tag>.<ciphertext>, all
// base64url. Versioned so a future scheme change is a decode-time branch,
// not a migration.
const SCHEME_VERSION = 'v1'
const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12 // GCM's native nonce size
const KEY_BYTES = 32

export class UnknownKeyError extends Error {
  constructor(keyId: string) {
    super(`No encryption key registered for keyId "${keyId}" — was it rotated out of SUPABASE_ENCRYPTION_KEY_PREVIOUS too early?`)
    this.name = 'UnknownKeyError'
  }
}

export class MalformedCiphertextError extends Error {
  constructor(reason: string) {
    super(`Malformed ciphertext payload: ${reason}`)
    this.name = 'MalformedCiphertextError'
  }
}

type KeyEntry = { id: string; key: Buffer }
type Keyring = { current: KeyEntry; previous: KeyEntry[] }

function keyId(key: Buffer): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 8)
}

function decodeKey(raw: string, envVarName: string): Buffer {
  const decoded = Buffer.from(raw, 'base64')
  if (decoded.length === KEY_BYTES) return decoded

  if (process.env['NODE_ENV'] === 'production') {
    throw new Error(
      `${envVarName} must decode (base64) to exactly ${KEY_BYTES} bytes — got ${decoded.length}. ` +
      `Generate one with: openssl rand -base64 32`
    )
  }

  // Non-production convenience fallback for a placeholder/short value
  // (e.g. the literal ".env.example" text) so local dev doesn't hard-fail
  // before secrets are provisioned. Never taken in production.
  console.warn(
    `[crypto] ${envVarName} is not a valid 32-byte base64 key (dev-only fallback engaged — ` +
    `derive one properly before deploying). Run: openssl rand -base64 32`
  )
  return scryptSync(raw, 'stockalert:creds:v1', KEY_BYTES)
}

let cachedKeyring: Keyring | null = null

/** Memoized: keys are derived once per process, not per call. */
export function getKeyring(): Keyring {
  if (cachedKeyring) return cachedKeyring

  const rawCurrent = process.env['SUPABASE_ENCRYPTION_KEY']
  if (!rawCurrent) {
    throw new Error('SUPABASE_ENCRYPTION_KEY is not set — required to encrypt/decrypt stored credentials.')
  }
  const currentKey = decodeKey(rawCurrent, 'SUPABASE_ENCRYPTION_KEY')
  const current: KeyEntry = { id: keyId(currentKey), key: currentKey }

  const rawPrevious = process.env['SUPABASE_ENCRYPTION_KEY_PREVIOUS'] ?? ''
  const previous: KeyEntry[] = rawPrevious
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => {
      const key = decodeKey(raw, 'SUPABASE_ENCRYPTION_KEY_PREVIOUS')
      return { id: keyId(key), key }
    })

  cachedKeyring = { current, previous }
  return cachedKeyring
}

/** Test-only: force key material to be re-read/re-derived on next call. */
export function __resetKeyringCacheForTests(): void {
  cachedKeyring = null
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url')
}

/**
 * Encrypts `plaintext`, binding it to `aad` (additional authenticated
 * data — typically `"<table>:<row id>"`) so the ciphertext cannot be
 * decrypted if copied into a different row, even with DB write access.
 */
export function encrypt(plaintext: string, aad: string): string {
  const { current } = getKeyring()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, current.key, iv)
  cipher.setAAD(Buffer.from(aad, 'utf8'))
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [SCHEME_VERSION, current.id, b64url(iv), b64url(tag), b64url(ciphertext)].join('.')
}

/** Decrypts a payload produced by `encrypt`. `aad` must match exactly. */
export function decrypt(payload: string, aad: string): string {
  const parts = payload.split('.')
  if (parts.length !== 5) {
    throw new MalformedCiphertextError(`expected 5 dot-separated segments, got ${parts.length}`)
  }
  const [version, id, ivPart, tagPart, ciphertextPart] = parts as [string, string, string, string, string]
  if (version !== SCHEME_VERSION) {
    throw new MalformedCiphertextError(`unsupported scheme version "${version}"`)
  }

  const { current, previous } = getKeyring()
  const entry = [current, ...previous].find((k) => k.id === id)
  if (!entry) throw new UnknownKeyError(id)

  let iv: Buffer, tag: Buffer, ciphertext: Buffer
  try {
    iv = Buffer.from(ivPart, 'base64url')
    tag = Buffer.from(tagPart, 'base64url')
    ciphertext = Buffer.from(ciphertextPart, 'base64url')
  } catch {
    throw new MalformedCiphertextError('invalid base64url segment')
  }

  const decipher = createDecipheriv(ALGORITHM, entry.key, iv)
  decipher.setAAD(Buffer.from(aad, 'utf8'))
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}

export function encryptJSON<T>(value: T, aad: string): string {
  return encrypt(JSON.stringify(value), aad)
}

export function decryptJSON<T>(payload: string, aad: string, schema: ZodType<T>): T {
  const parsed: unknown = JSON.parse(decrypt(payload, aad))
  return schema.parse(parsed)
}

/** True if `value` looks like an encrypt() payload (for migration/backfill detection). */
export function isEncrypted(value: string): boolean {
  return /^v1\.[0-9a-f]{8}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)
}

/** Generates a row id client-side so it can be used as AAD before INSERT. */
export function generateRowId(): string {
  return randomUUID()
}
