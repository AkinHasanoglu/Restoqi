import { describe, it, expect } from 'vitest'
import { getMessages } from '@stockalert/i18n/server'
import { locales, defaultLocale, type Locale } from '@stockalert/i18n'
import { getEmailTranslator } from './i18n'

function flattenKeys(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') return []
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === 'object' && value !== null ? flattenKeys(value, path) : [path]
  })
}

describe('emails.json — locale parity', () => {
  const referenceKeys = flattenKeys(getMessages(defaultLocale, ['emails'])['emails']).sort()

  it('the reference locale (en) actually has translation keys (sanity check the fixture itself loaded)', () => {
    expect(referenceKeys.length).toBeGreaterThan(10)
  })

  for (const locale of locales) {
    it(`${locale}/emails.json has exactly the same keys as ${defaultLocale}/emails.json`, () => {
      const keys = flattenKeys(getMessages(locale, ['emails'])['emails']).sort()
      expect(keys).toEqual(referenceKeys)
    })
  }
})

describe('getEmailTranslator', () => {
  it('interpolates {placeholder} params', () => {
    const t = getEmailTranslator('en')
    const text = t('lowStockAlert.body', { productName: 'Widget', storeName: 'My Shop' })
    expect(text).toBe('Widget in My Shop is running low.')
  })

  it('resolves a nested key for every supported locale without falling back to the raw key', () => {
    for (const locale of locales) {
      const t = getEmailTranslator(locale)
      const heading = t('lowStockAlert.heading')
      expect(heading).not.toBe('lowStockAlert.heading')
      expect(heading.length).toBeGreaterThan(0)
    }
  })

  it('falls back to the default locale for an unrecognized locale rather than rendering the raw key', () => {
    // getMessages() returns {} for a locale whose JSON file doesn't exist
    // (see packages/i18n/src/get-messages.ts's try/catch) — this exercises
    // getEmailTranslator's own fallback-to-defaultLocale path on top of that.
    const t = getEmailTranslator('xx' as Locale)
    expect(t('lowStockAlert.heading')).toBe(getEmailTranslator(defaultLocale)('lowStockAlert.heading'))
  })

  it('returns the dotted key itself if even the fallback locale is missing it (never "undefined")', () => {
    const t = getEmailTranslator('en')
    expect(t('this.key.does.not.exist')).toBe('this.key.does.not.exist')
  })
})
