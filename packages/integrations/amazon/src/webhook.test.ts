import { describe, it, expect } from 'vitest'
import { amazonConnector } from './index'

describe('amazonConnector', () => {
  it('declares supportsPush: false — SP-API notifications go to SQS/EventBridge, not an HTTPS webhook this route receives', () => {
    expect(amazonConnector.supportsPush).toBe(false)
  })

  it('verifyWebhookSignature always rejects (poll-only for launch, per Faz 7)', async () => {
    const valid = await amazonConnector.verifyWebhookSignature({
      headers: {},
      rawBody: '{}',
      secret: '',
      url: 'https://app.example.com/api/webhooks/amazon',
      ip: '1.2.3.4',
      query: {},
    })
    expect(valid).toBe(false)
  })
})
