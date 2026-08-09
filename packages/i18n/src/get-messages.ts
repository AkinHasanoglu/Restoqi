import type { AbstractIntlMessages } from 'next-intl'
import type { Locale } from './config'

type Namespace = 'common' | 'landing' | 'dashboard' | 'auth'

export function getMessages(locale: Locale, namespaces: Namespace[]): AbstractIntlMessages {
  const messages: AbstractIntlMessages = {}
  for (const ns of namespaces) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      messages[ns] = require(`../locales/${locale}/${ns}.json`) as AbstractIntlMessages
    } catch {
      messages[ns] = {}
    }
  }
  return messages
}
