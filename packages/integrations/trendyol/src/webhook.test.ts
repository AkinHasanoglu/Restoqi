import { describe, it, expect, afterEach } from 'vitest'
import { trendyolConnector } from './index'

const STORE_SECRET = 'store-webhook-password'

function basicAuthHeader(password: string, user = 'trendyol'): string {
  return 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64')
}

function verifyInput(overrides: Partial<Parameters<typeof trendyolConnector.verifyWebhookSignature>[0]>) {
  return {
    headers: {},
    rawBody: '{}',
    secret: STORE_SECRET,
    url: 'https://app.example.com/api/webhooks/trendyol',
    ip: '1.2.3.4',
    query: {},
    ...overrides,
  }
}

describe('trendyolConnector.verifyWebhookSignature — Basic auth', () => {
  afterEach(() => {
    delete process.env['TRENDYOL_WEBHOOK_IPS']
  })

  it('accepts the correct Basic auth password (per-store secret)', async () => {
    const valid = await trendyolConnector.verifyWebhookSignature(
      verifyInput({ headers: { authorization: basicAuthHeader(STORE_SECRET) } }),
    )
    expect(valid).toBe(true)
  })

  it('rejects the wrong password', async () => {
    const valid = await trendyolConnector.verifyWebhookSignature(
      verifyInput({ headers: { authorization: basicAuthHeader('wrong-password') } }),
    )
    expect(valid).toBe(false)
  })

  it('rejects a missing Authorization header', async () => {
    const valid = await trendyolConnector.verifyWebhookSignature(verifyInput({}))
    expect(valid).toBe(false)
  })

  it('rejects a non-Basic Authorization scheme', async () => {
    const valid = await trendyolConnector.verifyWebhookSignature(
      verifyInput({ headers: { authorization: 'Bearer sometoken' } }),
    )
    expect(valid).toBe(false)
  })

  it('rejects when no per-store secret is configured yet', async () => {
    const valid = await trendyolConnector.verifyWebhookSignature(
      verifyInput({ secret: '', headers: { authorization: basicAuthHeader(STORE_SECRET) } }),
    )
    expect(valid).toBe(false)
  })
})

describe('trendyolConnector.verifyWebhookSignature — IP allowlist', () => {
  afterEach(() => {
    delete process.env['TRENDYOL_WEBHOOK_IPS']
  })

  it('allows a request from an allowlisted IP with correct auth', async () => {
    process.env['TRENDYOL_WEBHOOK_IPS'] = '10.0.0.1, 10.0.0.2'
    const valid = await trendyolConnector.verifyWebhookSignature(
      verifyInput({ ip: '10.0.0.2', headers: { authorization: basicAuthHeader(STORE_SECRET) } }),
    )
    expect(valid).toBe(true)
  })

  it('rejects a request from an IP outside the allowlist, even with correct auth', async () => {
    process.env['TRENDYOL_WEBHOOK_IPS'] = '10.0.0.1'
    const valid = await trendyolConnector.verifyWebhookSignature(
      verifyInput({ ip: '203.0.113.9', headers: { authorization: basicAuthHeader(STORE_SECRET) } }),
    )
    expect(valid).toBe(false)
  })

  it('skips the IP check entirely when TRENDYOL_WEBHOOK_IPS is unset', async () => {
    const valid = await trendyolConnector.verifyWebhookSignature(
      verifyInput({ ip: '203.0.113.9', headers: { authorization: basicAuthHeader(STORE_SECRET) } }),
    )
    expect(valid).toBe(true)
  })
})
