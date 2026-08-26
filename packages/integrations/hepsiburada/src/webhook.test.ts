import { describe, it, expect } from 'vitest'
import { hepsiburadaConnector } from './index'

describe('hepsiburadaConnector', () => {
  it('declares supportsPush: false — no public stock-change webhook product exists', () => {
    expect(hepsiburadaConnector.supportsPush).toBe(false)
  })

  it('verifyWebhookSignature always rejects (there is no signature scheme to verify)', async () => {
    const valid = await hepsiburadaConnector.verifyWebhookSignature({
      headers: {},
      rawBody: '{}',
      secret: '',
      url: 'https://app.example.com/api/webhooks/hepsiburada',
      ip: '1.2.3.4',
      query: {},
    })
    expect(valid).toBe(false)
  })
})
