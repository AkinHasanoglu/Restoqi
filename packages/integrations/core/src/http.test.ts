import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { hmacSHA256, timingSafeEqual } from './http'

describe('hmacSHA256', () => {
  it('matches Node crypto directly for hex encoding (default)', () => {
    const expected = createHmac('sha256', 'secret').update('payload').digest('hex')
    expect(hmacSHA256('secret', 'payload')).toBe(expected)
  })

  it('matches Node crypto directly for base64 encoding', () => {
    const expected = createHmac('sha256', 'secret').update('payload').digest('base64')
    expect(hmacSHA256('secret', 'payload', 'base64')).toBe(expected)
  })

  it('hex and base64 outputs for the same input differ (regression guard)', () => {
    // The original bug compared a hex digest against Shopify's base64
    // X-Shopify-Hmac-Sha256 header — they can never match. This test
    // fails if hex/base64 ever silently collapse to the same encoding.
    const hex = hmacSHA256('secret', 'payload', 'hex')
    const base64 = hmacSHA256('secret', 'payload', 'base64')
    expect(hex).not.toBe(base64)
  })

  it('is synchronous (no floating promise)', () => {
    const result = hmacSHA256('secret', 'payload')
    expect(typeof result).toBe('string')
  })
})

describe('timingSafeEqual', () => {
  it('returns true for identical strings', () => {
    expect(timingSafeEqual('abc123', 'abc123')).toBe(true)
  })

  it('returns false for different strings of the same length', () => {
    expect(timingSafeEqual('abc123', 'abc124')).toBe(false)
  })

  it('returns false for different-length strings without throwing', () => {
    expect(timingSafeEqual('short', 'a-much-longer-string')).toBe(false)
  })

  it('rejects a hex digest compared against a base64 digest of the same HMAC', () => {
    const hex = hmacSHA256('secret', 'payload', 'hex')
    const base64 = hmacSHA256('secret', 'payload', 'base64')
    expect(timingSafeEqual(hex, base64)).toBe(false)
  })
})
