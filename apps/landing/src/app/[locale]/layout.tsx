import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { GeistMono } from 'geist/font/mono'
import { Caprasimo, Figtree } from 'next/font/google'
import { locales, defaultLocale, type Locale } from '@stockalert/i18n'
import { PostHogProvider } from '../../components/posthog-provider'
import '../globals.css'

const headingFont = Caprasimo({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-heading',
  display: 'swap',
})

const bodyFont = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

// next-intl's "as-needed" localePrefix (see middleware.ts) means the
// default locale has no /en prefix — mirrored here for canonical/hreflang.
function localizedPath(locale: string): string {
  return locale === defaultLocale ? '/' : `/${locale}`
}

// generateMetadata (rather than a static `metadata` export) so
// description and openGraph.locale are localized and every page gets
// hreflang alternates — previously the whole site shared one English
// description regardless of locale, and search engines had no signal
// that /tr, /de, etc. are the same page in another language.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = (locales.includes(rawLocale as Locale) ? rawLocale : defaultLocale) as Locale
  const t = await getTranslations({ locale, namespace: 'landing.hero' })
  // Was a hardcoded English string regardless of locale — every non-EN
  // visitor got an English <title> even though description/openGraph.locale
  // were already localized below. See "batırma listesi" audit item 20.
  const tMeta = await getTranslations({ locale, namespace: 'landing.meta' })

  const languages: Record<string, string> = {}
  for (const altLocale of locales) languages[altLocale] = localizedPath(altLocale)

  return {
    metadataBase: new URL(process.env['NEXT_PUBLIC_LANDING_URL'] ?? 'http://localhost:3000'),
    title: {
      default: tMeta('home.title'),
      template: '%s | StockAlert',
    },
    description: t('subtitle'),
    keywords: ['stock alerts', 'inventory management', 'Shopify', 'Trendyol', 'Amazon', 'e-commerce'],
    alternates: {
      canonical: localizedPath(locale),
      languages,
    },
    openGraph: {
      type: 'website',
      siteName: 'StockAlert',
      locale,
      images: [{ url: '/brand/og.png', width: 1200, height: 630, alt: 'StockAlert' }],
    },
    twitter: {
      card: 'summary_large_image',
      images: ['/brand/og.png'],
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = (locales.includes(rawLocale as Locale) ? rawLocale : defaultLocale) as Locale
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${headingFont.variable} ${bodyFont.variable} ${GeistMono.variable} font-body antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <PostHogProvider>{children}</PostHogProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
