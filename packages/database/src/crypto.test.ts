import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import {
  encrypt,
  decrypt,
  encryptJSON,
  decryptJSON,
  isEncrypted,
  getKeyring,
  UnknownKeyError,
  MalformedCiphertextError,
  __resetKeyringCacheForTests,
} from './crypto'

const KEY_A = Buffer.alloc(32, 1).toString('base64')
const KEY_B = Buffer.alloc(32, 2).toString('base64')

const originalEnv = { ...process.env }

function setEnv(vars: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  __resetKeyringCacheForTests()
}

beforeEach(() => {
  setEnv({ SUPABASE_ENCRYPTION_KEY: KEY_A, SUPABASE_ENCRYPTION_KEY_PREVIOUS: undefined, NODE_ENV: 'test' })
})

afterEach(() => {
  process.env = { ...originalEnv }
  __resetKeyringCacheForTests()
})

describe('encrypt/decrypt roundtrip', () => {
  it('decrypts back to the original plaintext', () => {
    const payload = encrypt('super-secret-token', 'connected_stores:store-1')
    expect(decrypt(payload, 'connected_stores:store-1')).toBe('super-secret-token')
  })

  it('produces a different ciphertext each time (IV uniqueness)', () => {
    const a = encrypt('same-plaintext', 'aad')
    const b = encrypt('same-plaintext', 'aad')
    expect(a).not.toBe(b)
    expect(decrypt(a, 'aad')).toBe('same-plaintext')
    expect(decrypt(b, 'aad')).toBe('same-plaintext')
  })

  it('matches the v1.<keyId>.<iv>.<tag>.<ciphertext> wire format', () => {
    const payload = encrypt('x', 'aad')
    expect(payload.split('.')).toHaveLength(5)
    expect(isEncrypted(payload)).toBe(true)
  })
})

describe('tamper detection', () => {
  it('throws when a ciphertext byte is flipped', () => {
    const payload = encrypt('secret', 'aad')
    const parts = payload.split('.')
    const ciphertext = parts[4]!
    const tamperedChar = ciphertext[0] === 'A' ? 'B' : 'A'
    parts[4] = tamperedChar + ciphertext.slice(1)
    expect(() => decrypt(parts.join('.'), 'aad')).toThrow()
  })

  it('throws when decrypted with the wrong AAD', () => {
    const payload = encrypt('secret', 'connected_stores:store-1')
    expect(() => decrypt(payload, 'connected_stores:store-2')).toThrow()
  })
})

describe('key rotation', () => {
  it('decrypts old ciphertext with a key from SUPABASE_ENCRYPTION_KEY_PREVIOUS after rotation', () => {
    const payload = encrypt('rotate-me', 'aad')

    // Rotate: B becomes current, A becomes previous.
    setEnv({ SUPABASE_ENCRYPTION_KEY: KEY_B, SUPABASE_ENCRYPTION_KEY_PREVIOUS: KEY_A })

    expect(decrypt(payload, 'aad')).toBe('rotate-me')
    // New encryptions use the new current key.
    const freshPayload = encrypt('rotate-me', 'aad')
    expect(freshPayload).not.toBe(payload)
    expect(decrypt(freshPayload, 'aad')).toBe('rotate-me')
  })

  it('throws UnknownKeyError once the old key is fully retired', () => {
    const payload = encrypt('rotate-me', 'aad')
    setEnv({ SUPABASE_ENCRYPTION_KEY: KEY_B, SUPABASE_ENCRYPTION_KEY_PREVIOUS: undefined })
    expect(() => decrypt(payload, 'aad')).toThrow(UnknownKeyError)
  })
})

describe('malformed input', () => {
  it('throws MalformedCiphertextError on a garbage payload', () => {
    expect(() => decrypt('not-a-real-payload', 'aad')).toThrow(MalformedCiphertextError)
  })

  it('throws MalformedCiphertextError on an unsupported scheme version', () => {
    const payload = encrypt('x', 'aad')
    const rest = payload.split('.').slice(1).join('.')
    expect(() => decrypt(`v2.${rest}`, 'aad')).toThrow(MalformedCiphertextError)
  })
})

describe('key validation', () => {
  it('fails fast in production when the key is not 32 bytes', () => {
    setEnv({ SUPABASE_ENCRYPTION_KEY: 'your-32-char-random-encryption-key', NODE_ENV: 'production' })
    expect(() => getKeyring()).toThrow()
  })

  it('falls back to a derived key outside production (with a warning), rather than throwing', () => {
    setEnv({ SUPABASE_ENCRYPTION_KEY: 'your-32-char-random-encryption-key', NODE_ENV: 'test' })
    expect(() => getKeyring()).not.toThrow()
  })
})

describe('JSON helpers', () => {
  const Schema = z.object({ type: z.literal('apiKey'), apiKey: z.string() })

  it('round-trips structured data through encryptJSON/decryptJSON', () => {
    const value = { type: 'apiKey' as const, apiKey: 'abc123' }
    const payload = encryptJSON(value, 'api_keys:key-1')
    expect(decryptJSON(payload, 'api_keys:key-1', Schema)).toEqual(value)
  })

  it('rejects data that fails schema validation after decryption', () => {
    const payload = encryptJSON({ wrong: 'shape' }, 'aad')
    expect(() => decryptJSON(payload, 'aad', Schema)).toThrow()
  })
})

describe('isEncrypted', () => {
  it('returns false for plain strings', () => {
    expect(isEncrypted('plain-api-key-value')).toBe(false)
    expect(isEncrypted('')).toBe(false)
  })

  it('returns true for a real encrypted payload', () => {
    expect(isEncrypted(encrypt('x', 'aad'))).toBe(true)
  })
})
