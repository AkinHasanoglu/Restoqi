import { describe, it, expect, beforeEach } from 'vitest'
import { createHmac } from 'node:crypto'
import { shopifyConnector } from './index'

const SECRET = 'shpss_test_secret'

beforeEach(() => {
  process.env['SHOPIFY_CLIENT_SECRET'] = SECRET
})

function signBody(body: string): string {
  return createHmac('sha256', SECRET).update(body).digest('base64')
}

function verifyInput(overrides: Partial<Parameters<typeof shopifyConnector.verifyWebhookSignature>[0]>) {
  return {
    headers: {},
    rawBody: '{}',
    secret: '',
    url: 'https://app.example.com/api/webhooks/shopify',
    ip: '1.2.3.4',
    query: {},
    ...overrides,
  }
}

describe('shopifyConnector.verifyWebhookSignature', () => {
  it('accepts a correctly signed request', async () => {
    const rawBody = JSON.stringify({ inventory_item_id: 123, available: 5 })
    const valid = await shopifyConnector.verifyWebhookSignature(
      verifyInput({ headers: { 'x-shopify-hmac-sha256': signBody(rawBody) }, rawBody }),
    )
    expect(valid).toBe(true)
  })

  it('rejects a tampered body', async () => {
    const originalBody = JSON.stringify({ inventory_item_id: 123, available: 5 })
    const signature = signBody(originalBody)
    const valid = await shopifyConnector.verifyWebhookSignature(
      verifyInput({
        headers: { 'x-shopify-hmac-sha256': signature },
        rawBody: JSON.stringify({ inventory_item_id: 123, available: 999 }),
      }),
    )
    expect(valid).toBe(false)
  })

  it('rejects a request with no signature header', async () => {
    const valid = await shopifyConnector.verifyWebhookSignature(verifyInput({}))
    expect(valid).toBe(false)
  })

  it('regression: a hex-encoded digest of the same payload does not validate (the original bug)', async () => {
    // The bug this guards against: comparing a hex HMAC digest against
    // Shopify's base64 X-Shopify-Hmac-Sha256 header — they can never
    // match regardless of whether the secret/body are correct.
    const rawBody = JSON.stringify({ a: 1 })
    const hexDigest = createHmac('sha256', SECRET).update(rawBody).digest('hex')
    const valid = await shopifyConnector.verifyWebhookSignature(
      verifyInput({ headers: { 'x-shopify-hmac-sha256': hexDigest }, rawBody }),
    )
    expect(valid).toBe(false)
  })

  it('rejects when signed with the wrong secret', async () => {
    const rawBody = JSON.stringify({ a: 1 })
    const wrongSignature = createHmac('sha256', 'not-the-real-secret').update(rawBody).digest('base64')
    const valid = await shopifyConnector.verifyWebhookSignature(
      verifyInput({ headers: { 'x-shopify-hmac-sha256': wrongSignature }, rawBody }),
    )
    expect(valid).toBe(false)
  })
})
