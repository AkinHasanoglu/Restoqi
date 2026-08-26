import { describe, it, expect } from 'vitest'
import { SUPPORTED_PLATFORMS, isSupportedPlatform } from './registry'

describe('isSupportedPlatform', () => {
  it('accepts all 7 supported platforms', () => {
    for (const platform of SUPPORTED_PLATFORMS) {
      expect(isSupportedPlatform(platform)).toBe(true)
    }
    expect(SUPPORTED_PLATFORMS).toHaveLength(7)
  })

  it('rejects a prototype-pollution payload', () => {
    // The naive implementation this guards a regression for cast an
    // arbitrary string to PlatformType via a type assertion — '__proto__'
    // is exactly the kind of string that then gets used as a dynamic
    // property/module lookup key elsewhere (getConnector, webhook route
    // dispatch) and must never be treated as valid input.
    expect(isSupportedPlatform('__proto__')).toBe(false)
    expect(isSupportedPlatform('constructor')).toBe(false)
    expect(isSupportedPlatform('prototype')).toBe(false)
  })

  it('is case-sensitive — "Shopify" is not "shopify"', () => {
    expect(isSupportedPlatform('Shopify')).toBe(false)
    expect(isSupportedPlatform('SHOPIFY')).toBe(false)
  })

  it('rejects an empty string and unrelated garbage', () => {
    expect(isSupportedPlatform('')).toBe(false)
    expect(isSupportedPlatform('woocommerce')).toBe(false)
    expect(isSupportedPlatform('shopify ')).toBe(false)
  })
})
