import type { MetadataRoute } from 'next'
import { locales } from '@stockalert/i18n'

const BASE_URL = process.env['NEXT_PUBLIC_LANDING_URL'] ?? 'http://localhost:3000'

const ROUTES = ['', '/pricing', '/solutions', '/docs', '/blog', '/legal']

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []

  for (const locale of locales) {
    for (const route of ROUTES) {
      entries.push({
        url: `${BASE_URL}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' ? 'daily' : 'weekly',
        priority: route === '' ? 1 : 0.8,
      })
    }
  }

  return entries
}
