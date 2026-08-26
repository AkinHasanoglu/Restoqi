import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { Logo } from '@stockalert/ui'
import { type Locale } from '@stockalert/i18n'

const FOOTER_LINKS = {
  product: [
    { labelKey: 'nav.features', href: '/#features' },
    { labelKey: 'nav.howItWorks', href: '/how-it-works' },
    { labelKey: 'nav.integrations', href: '/integrations' },
    { labelKey: 'nav.pricing', href: '/pricing' },
    { labelKey: 'nav.docs', href: '/docs' },
  ],
  company: [
    { labelKey: 'footer.about', href: '/about' },
    { labelKey: 'footer.blog', href: '/blog' },
    { labelKey: 'footer.contact', href: '/contact' },
  ],
  legal: [
    { labelKey: 'footer.terms', href: '/legal/terms' },
    { labelKey: 'footer.privacy', href: '/legal/privacy' },
    { labelKey: 'footer.dpa', href: '/legal/dpa' },
    { labelKey: 'footer.cookies', href: '/legal/cookies' },
    { labelKey: 'footer.subprocessors', href: '/legal/subprocessors' },
  ],
} as const

export function Footer() {
  const t = useTranslations('landing')
  const tCommon = useTranslations('common')
  const locale = useLocale() as Locale
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border/50 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href={`/${locale}`} className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <Logo compact height={28} />
              <span className="font-heading text-base leading-none">StockAlert</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">{t('footer.tagline')}</p>
          </div>

          {/* Product */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">{t('footer.product')}</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.product.map(({ labelKey, href }) => (
                <li key={href}>
                  <Link href={`/${locale}${href}`} className="text-sm text-muted-foreground hover:text-primary">
                    {tCommon(labelKey as Parameters<typeof tCommon>[0])}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">{t('footer.company')}</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.company.map(({ labelKey, href }) => (
                <li key={href}>
                  <Link href={`/${locale}${href}`} className="text-sm text-muted-foreground hover:text-primary">
                    {t(labelKey)}
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
                  <Link href={`/${locale}${href}`} className="text-sm text-muted-foreground hover:text-primary">
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
