import type { MetadataRoute } from 'next'
import { locales, defaultLocale } from '@stockalert/i18n'

const BASE_URL = process.env['NEXT_PUBLIC_LANDING_URL'] ?? 'http://localhost:3000'

const ROUTES = [
  { path: '', priority: 1, changeFrequency: 'daily' as const },
  { path: '/how-it-works', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/integrations', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/pricing', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/faq', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/contact', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/docs', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/blog', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/legal', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/legal/terms', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/legal/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/legal/dpa', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/legal/cookies', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/legal/subprocessors', priority: 0.3, changeFrequency: 'monthly' as const },
]

// locale path helper — mirrors next-intl's "as-needed" prefix convention
// used throughout the app (defaultLocale has no /en prefix, see
// navbar.tsx's switchLocale and middleware.ts).
function localizedPath(locale: string, route: string): string {
  return locale === defaultLocale ? route || '/' : `/${locale}${route}`
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []

  for (const { path, priority, changeFrequency } of ROUTES) {
    // hreflang alternates so search engines know the same page exists in
    // every locale rather than treating each locale's URL as separate,
    // unrelated content.
    const languages: Record<string, string> = {}
    for (const altLocale of locales) {
      languages[altLocale] = `${BASE_URL}${localizedPath(altLocale, path)}`
    }

    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}${localizedPath(locale, path)}`,
        lastModified: new Date(),
        changeFrequency,
        priority,
        alternates: { languages },
      })
    }
  }

  return entries
}
