import { describe, it, expect, beforeEach } from 'vitest'
import { createHmac } from 'node:crypto'
import { aliexpressConnector } from './index'

const APP_SECRET = 'test-app-secret'

// Reimplements the connector's private `sign()` independently (sorted
// key+value concatenation, HMAC-MD5, uppercase hex) — a known-vector test
// that imported the same function under test would only prove the
// function agrees with itself.
function sign(params: Record<string, string>, appSecret: string): string {
  const sorted = Object.keys(params).sort().map((k) => `${k}${params[k]}`).join('')
  return createHmac('md5', appSecret).update(sorted).digest('hex').toUpperCase()
}

function verifyInput(overrides: Partial<Parameters<typeof aliexpressConnector.verifyWebhookSignature>[0]>) {
  return {
    headers: {},
    rawBody: '{}',
    secret: '',
    url: 'https://app.example.com/api/webhooks/aliexpress',
    ip: '1.2.3.4',
    query: {},
    ...overrides,
  }
}

describe('aliexpressConnector: sign() known vector', () => {
  it('matches a hand-computed HMAC-MD5 uppercase hex digest', () => {
    // { a: '1', b: '2' } sorted -> "a1b2"
    const expected = createHmac('md5', APP_SECRET).update('a1b2').digest('hex').toUpperCase()
    expect(sign({ b: '2', a: '1' }, APP_SECRET)).toBe(expected)
  })

  it('is uppercase (AliExpress compares case-sensitively)', () => {
    const digest = sign({ x: 'y' }, APP_SECRET)
    expect(digest).toBe(digest.toUpperCase())
  })
})

describe('aliexpressConnector.verifyWebhookSignature', () => {
  beforeEach(() => {
    process.env['ALIEXPRESS_APP_SECRET'] = APP_SECRET
  })

  it('accepts a correctly signed payload', async () => {
    const params = { product_id: '123', event: 'stock_change', quantity: '5' }
    const rawBody = JSON.stringify({ ...params, sign: sign(params, APP_SECRET) })
    const valid = await aliexpressConnector.verifyWebhookSignature(verifyInput({ rawBody }))
    expect(valid).toBe(true)
  })

  it('rejects a tampered payload (signature no longer matches)', async () => {
    const params = { product_id: '123', quantity: '5' }
    const correctSign = sign(params, APP_SECRET)
    const rawBody = JSON.stringify({ product_id: '123', quantity: '999', sign: correctSign })
    const valid = await aliexpressConnector.verifyWebhookSignature(verifyInput({ rawBody }))
    expect(valid).toBe(false)
  })

  it('rejects a payload with no sign field', async () => {
    const rawBody = JSON.stringify({ product_id: '123' })
    const valid = await aliexpressConnector.verifyWebhookSignature(verifyInput({ rawBody }))
    expect(valid).toBe(false)
  })

  it('rejects invalid JSON bodies without throwing', async () => {
    const valid = await aliexpressConnector.verifyWebhookSignature(verifyInput({ rawBody: 'not json' }))
    expect(valid).toBe(false)
  })

  it('rejects a signature computed with the wrong app secret', async () => {
    const params = { product_id: '123' }
    const wrongSign = sign(params, 'a-different-secret')
    const rawBody = JSON.stringify({ ...params, sign: wrongSign })
    const valid = await aliexpressConnector.verifyWebhookSignature(verifyInput({ rawBody }))
    expect(valid).toBe(false)
  })
})
