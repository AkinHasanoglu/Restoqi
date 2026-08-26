import { getMessages } from '@stockalert/i18n/server'
import { defaultLocale, type Locale } from '@stockalert/i18n'

export { defaultLocale }
export type { Locale }

type Messages = Record<string, unknown>

function getNested(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match))
}

/**
 * Minimal, dependency-free translator for this package's templates.
 * They render server-side via @react-email/render, outside any React
 * context/provider — next-intl's hook-based APIs (useTranslations) need a
 * <NextIntlClientProvider>, which doesn't exist here. This covers exactly
 * what an alert/transactional email needs: nested-key lookup plus
 * `{placeholder}` interpolation, no pluralization/ICU required.
 *
 * Falls back to `defaultLocale` (en) key-by-key, so a partially-translated
 * locale never renders a raw dotted key or "undefined" in a customer email.
 */
export function getEmailTranslator(locale: Locale) {
  const messages = getMessages(locale, ['emails'])['emails'] as Messages | undefined
  const fallbackMessages =
    locale === defaultLocale ? messages : (getMessages(defaultLocale, ['emails'])['emails'] as Messages | undefined)

  return function t(key: string, params?: Record<string, string | number>): string {
    const value = messages ? getNested(messages, key) : undefined
    if (typeof value === 'string') return interpolate(value, params)

    const fallbackValue = fallbackMessages ? getNested(fallbackMessages, key) : undefined
    if (typeof fallbackValue === 'string') return interpolate(fallbackValue, params)

    return key
  }
}

export type EmailTranslator = ReturnType<typeof getEmailTranslator>
