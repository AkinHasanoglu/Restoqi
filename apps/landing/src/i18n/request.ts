import { getRequestConfig } from 'next-intl/server'
import { locales, defaultLocale, type Locale } from '@stockalert/i18n'
import { getMessages } from '@stockalert/i18n/server'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale
  }

  const messages = getMessages(locale as Locale, ['common', 'landing', 'auth'])

  return { locale, messages }
})
