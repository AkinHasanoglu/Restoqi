export const locales = ['en', 'tr', 'de', 'fr', 'zh', 'ja', 'ru'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  tr: 'Türkçe',
  de: 'Deutsch',
  fr: 'Français',
  zh: '中文',
  ja: '日本語',
  ru: 'Русский',
}

export const localeFlags: Record<Locale, string> = {
  en: '🇬🇧',
  tr: '🇹🇷',
  de: '🇩🇪',
  fr: '🇫🇷',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ru: '🇷🇺',
}
