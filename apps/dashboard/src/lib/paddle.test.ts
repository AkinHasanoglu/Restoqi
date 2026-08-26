import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyPaddleSignature, buildPaddlePlanMap, assertPlanMapConfigured } from './paddle'

const SECRET = 'test-paddle-webhook-secret'

function sign(rawBody: string, ts: number, secret = SECRET): string {
  const digest = createHmac('sha256', secret).update(`${String(ts)}:${rawBody}`).digest('hex')
  return `ts=${String(ts)};h1=${digest}`
}

describe('verifyPaddleSignature', () => {
  it('accepts a correctly signed, fresh request', () => {
    const rawBody = JSON.stringify({ event_type: 'subscription.created' })
    const ts = Math.floor(Date.now() / 1000)
    expect(verifyPaddleSignature(rawBody, sign(rawBody, ts), SECRET)).toBe(true)
  })

  it('rejects a tampered body', () => {
    const rawBody = JSON.stringify({ event_type: 'subscription.created' })
    const ts = Math.floor(Date.now() / 1000)
    const header = sign(rawBody, ts)
    const tampered = JSON.stringify({ event_type: 'subscription.canceled' })
    expect(verifyPaddleSignature(tampered, header, SECRET)).toBe(false)
  })

  it('rejects a signature computed with the wrong secret', () => {
    const rawBody = JSON.stringify({ a: 1 })
    const ts = Math.floor(Date.now() / 1000)
    expect(verifyPaddleSignature(rawBody, sign(rawBody, ts, 'wrong-secret'), SECRET)).toBe(false)
  })

  it('rejects a stale timestamp (older than 5 minutes)', () => {
    const rawBody = JSON.stringify({ a: 1 })
    const staleTs = Math.floor(Date.now() / 1000) - 6 * 60
    expect(verifyPaddleSignature(rawBody, sign(rawBody, staleTs), SECRET)).toBe(false)
  })

  it('rejects a malformed header missing ts or h1', () => {
    expect(verifyPaddleSignature('{}', 'h1=deadbeef', SECRET)).toBe(false)
    expect(verifyPaddleSignature('{}', `ts=${String(Math.floor(Date.now() / 1000))}`, SECRET)).toBe(false)
    expect(verifyPaddleSignature('{}', '', SECRET)).toBe(false)
  })
})

describe('buildPaddlePlanMap', () => {
  it('resolves every configured price id to its plan and billing interval', () => {
    const map = buildPaddlePlanMap({
      NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER_MONTHLY: 'pri_starter_m',
      NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER_ANNUAL: 'pri_starter_a',
      NEXT_PUBLIC_PADDLE_PRICE_ID_GROWTH_MONTHLY: 'pri_growth_m',
      NEXT_PUBLIC_PADDLE_PRICE_ID_SCALE_ANNUAL: 'pri_scale_a',
    })
    expect(map).toEqual({
      pri_starter_m: { plan: 'starter', interval: 'monthly' },
      pri_starter_a: { plan: 'starter', interval: 'yearly' },
      pri_growth_m: { plan: 'growth', interval: 'monthly' },
      pri_scale_a: { plan: 'scale', interval: 'yearly' },
    })
  })

  it('produces an empty map when no price env vars are set', () => {
    expect(buildPaddlePlanMap({})).toEqual({})
  })

  it('ignores unrelated env vars', () => {
    expect(buildPaddlePlanMap({ SOME_OTHER_VAR: 'value' })).toEqual({})
  })
})

describe('assertPlanMapConfigured', () => {
  it('throws in production when the plan map is empty', () => {
    expect(() => assertPlanMapConfigured({}, 'production')).toThrow(/NEXT_PUBLIC_PADDLE_PRICE_ID/)
  })

  it('does not throw in production when the plan map has at least one entry', () => {
    expect(() => assertPlanMapConfigured({ pri_x: { plan: 'starter', interval: 'monthly' } }, 'production')).not.toThrow()
  })

  it('does not throw outside production even with an empty plan map', () => {
    expect(() => assertPlanMapConfigured({}, 'development')).not.toThrow()
    expect(() => assertPlanMapConfigured({}, 'test')).not.toThrow()
  })
})
