import { describe, it, expect } from 'vitest'
import { sanitizeNextPath } from './safe-redirect'

const FALLBACK = '/tr/overview'

describe('sanitizeNextPath', () => {
  it('accepts a plain internal path', () => {
    expect(sanitizeNextPath('/tr/products', FALLBACK)).toBe('/tr/products')
  })

  it('rejects an absolute URL to another host', () => {
    expect(sanitizeNextPath('https://evil.tld', FALLBACK)).toBe(FALLBACK)
  })

  it('rejects a protocol-relative URL', () => {
    expect(sanitizeNextPath('//evil.tld', FALLBACK)).toBe(FALLBACK)
  })

  it('rejects a backslash-prefixed path (browsers treat as protocol-relative)', () => {
    expect(sanitizeNextPath('/\\evil.tld', FALLBACK)).toBe(FALLBACK)
  })

  it('rejects a path with no leading slash', () => {
    expect(sanitizeNextPath('evil.tld', FALLBACK)).toBe(FALLBACK)
  })

  it('falls back on null/undefined/empty input', () => {
    expect(sanitizeNextPath(null, FALLBACK)).toBe(FALLBACK)
    expect(sanitizeNextPath(undefined, FALLBACK)).toBe(FALLBACK)
    expect(sanitizeNextPath('', FALLBACK)).toBe(FALLBACK)
  })
})
