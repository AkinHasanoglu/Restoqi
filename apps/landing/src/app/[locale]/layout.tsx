import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { locales, defaultLocale, type Locale } from '@stockalert/i18n'
import '../globals.css'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env['NEXT_PUBLIC_LANDING_URL'] ?? 'http://localhost:3000'),
  title: {
    default: 'StockAlert — Inventory Alerts for E-Commerce',
    template: '%s | StockAlert',
  },
  description:
    'Real-time stock alerts and AI-powered predictions for Shopify, Trendyol, Amazon, Etsy, eBay, Hepsiburada and AliExpress sellers.',
  keywords: ['stock alerts', 'inventory management', 'Shopify', 'Trendyol', 'Amazon', 'e-commerce'],
  openGraph: {
    type: 'website',
    siteName: 'StockAlert',
  },
  twitter: {
    card: 'summary_large_image',
  },
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
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
