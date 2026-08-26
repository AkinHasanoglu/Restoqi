import { describe, it, expect } from 'vitest'
import { etsyConnector } from './index'

describe('etsyConnector', () => {
  it('declares supportsPush: false — Etsy API v3 has no push webhooks, poll-only', () => {
    expect(etsyConnector.supportsPush).toBe(false)
  })

  it('verifyWebhookSignature always rejects (there is no signature scheme to verify)', async () => {
    const valid = await etsyConnector.verifyWebhookSignature({
      headers: {},
      rawBody: '{}',
      secret: '',
      url: 'https://app.example.com/api/webhooks/etsy',
      ip: '1.2.3.4',
      query: {},
    })
    expect(valid).toBe(false)
  })
})
