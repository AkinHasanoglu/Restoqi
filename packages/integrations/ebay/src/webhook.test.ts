import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createHash, createSign, generateKeyPairSync } from 'node:crypto'
import { ebayConnector } from './index'

function verifyInput(overrides: Partial<Parameters<typeof ebayConnector.verifyWebhookSignature>[0]>) {
  return {
    headers: {},
    rawBody: '{}',
    secret: '',
    url: 'https://app.example.com/api/webhooks/ebay',
    ip: '1.2.3.4',
    query: {},
    ...overrides,
  }
}

describe('ebayConnector.verifyChallenge', () => {
  const VERIFICATION_TOKEN = 'a'.repeat(32)

  beforeEach(() => {
    process.env['EBAY_VERIFICATION_TOKEN'] = VERIFICATION_TOKEN
  })

  it('returns the known SHA-256(challengeCode + verificationToken + endpoint) hex digest', async () => {
    const challengeCode = 'test-challenge-code'
    const endpoint = 'https://app.example.com/api/webhooks/ebay'

    const expected = createHash('sha256')
      .update(challengeCode)
      .update(VERIFICATION_TOKEN)
      .update(endpoint)
      .digest('hex')

    const result = await ebayConnector.verifyChallenge!({ url: endpoint, query: { challenge_code: challengeCode } })

    expect(result).not.toBeNull()
    expect(result?.status).toBe(200)
    expect(JSON.parse(result!.body)).toEqual({ challengeResponse: expected })
    expect(result?.contentType).toBe('application/json')
  })

  it('returns null when no challenge_code query param is present', async () => {
    const result = await ebayConnector.verifyChallenge!({ url: 'https://app.example.com/api/webhooks/ebay', query: {} })
    expect(result).toBeNull()
  })
})

describe('ebayConnector.verifyWebhookSignature', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
  const KID = 'test-kid-1'

  function sign(body: string): string {
    const signer = createSign('SHA256')
    signer.update(body)
    signer.end()
    const signature = signer.sign(privateKey).toString('base64')
    return Buffer.from(JSON.stringify({ alg: 'ECDSA', kid: KID, signature })).toString('base64')
  }

  beforeEach(() => {
    process.env['EBAY_CLIENT_ID'] = 'test-client-id'
    process.env['EBAY_CLIENT_SECRET'] = 'test-client-secret'

    // fetchWithRetry calls global fetch directly — stub the two endpoints
    // the connector hits to resolve a public key: the app-token endpoint
    // (client_credentials grant) and the public-key-by-kid endpoint.
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL) => {
      const href = url.toString()
      if (href.includes('/identity/v1/oauth2/token')) {
        return new Response(JSON.stringify({ access_token: 'app-token', expires_in: 3600 }), { status: 200 })
      }
      if (href.includes('/commerce/notification/v1/public_key/')) {
        return new Response(JSON.stringify({ key: publicKeyPem }), { status: 200 })
      }
      throw new Error(`Unexpected fetch: ${href}`)
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('accepts a correctly signed request against a fixture keypair', async () => {
    const rawBody = JSON.stringify({ metadata: { topic: 'MARKETPLACE_ACCOUNT_DELETION' } })
    const valid = await ebayConnector.verifyWebhookSignature(
      verifyInput({ headers: { 'x-ebay-signature': sign(rawBody) }, rawBody }),
    )
    expect(valid).toBe(true)
  })

  it('rejects a tampered body', async () => {
    const originalBody = JSON.stringify({ a: 1 })
    const signature = sign(originalBody)
    const valid = await ebayConnector.verifyWebhookSignature(
      verifyInput({ headers: { 'x-ebay-signature': signature }, rawBody: JSON.stringify({ a: 2 }) }),
    )
    expect(valid).toBe(false)
  })

  it('rejects a malformed (non-base64-JSON) x-ebay-signature header', async () => {
    const valid = await ebayConnector.verifyWebhookSignature(
      verifyInput({ headers: { 'x-ebay-signature': 'not-valid-base64-json!!!' } }),
    )
    expect(valid).toBe(false)
  })

  it('rejects a missing signature header', async () => {
    const valid = await ebayConnector.verifyWebhookSignature(verifyInput({}))
    expect(valid).toBe(false)
  })
})
