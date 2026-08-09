import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { Logo } from '@stockalert/ui'
import { type Locale } from '@stockalert/i18n'

const FOOTER_LINKS = {
  product: [
    { label: 'Solutions', href: '/solutions' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Docs', href: '/docs' },
    { label: 'Blog', href: '/blog' },
  ],
  company: [
    { label: 'About', href: '/about' },
    { label: 'Customers', href: '/customers' },
    { label: 'Contact', href: '/contact' },
  ],
  legal: [
    { labelKey: 'footer.terms', href: '/legal/terms' },
    { labelKey: 'footer.privacy', href: '/legal/privacy' },
    { labelKey: 'footer.dpa', href: '/legal/dpa' },
  ],
} as const

export function Footer() {
  const t = useTranslations('landing')
  const locale = useLocale() as Locale
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border/50 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href={`/${locale}`} className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <Logo compact height={24} />
              <span className="font-bold">StockAlert</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Real-time inventory alerts for modern e-commerce sellers.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">{t('footer.product')}</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.product.map(({ label, href }) => (
                <li key={href}>
                  <Link href={`/${locale}${href}`} className="text-sm text-muted-foreground hover:text-foreground">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">{t('footer.company')}</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.company.map(({ label, href }) => (
                <li key={href}>
                  <Link href={`/${locale}${href}`} className="text-sm text-muted-foreground hover:text-foreground">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">{t('footer.legal')}</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.legal.map(({ labelKey, href }) => (
                <li key={href}>
                  <Link href={`/${locale}${href}`} className="text-sm text-muted-foreground hover:text-foreground">
                    {t(labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border/50 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t('footer.copyright', { year })}
          </p>
        </div>
      </div>
    </footer>
  )
}
