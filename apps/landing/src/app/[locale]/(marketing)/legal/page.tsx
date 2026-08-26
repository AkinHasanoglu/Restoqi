import type { Metadata } from 'next'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import { type Locale } from '@stockalert/i18n'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing.meta.legal' })
  return { title: t('title'), description: t('description') }
}

const PAGES = [
  { href: '/legal/terms', labelKey: 'footer.terms' },
  { href: '/legal/privacy', labelKey: 'footer.privacy' },
  { href: '/legal/dpa', labelKey: 'footer.dpa' },
  { href: '/legal/subprocessors', labelKey: 'footer.subprocessors' },
  { href: '/legal/cookies', labelKey: 'footer.cookies' },
] as const

function LegalContent() {
  const t = useTranslations('landing')
  const locale = useLocale() as Locale

  return (
    <div className="mx-auto max-w-3xl px-4 py-32">
      <h1 className="text-3xl font-bold">{t('legal.title')}</h1>
      <p className="mt-3 text-muted-foreground">{t('legal.subtitle')}</p>

      <ul className="mt-8 space-y-2">
        {PAGES.map(({ href, labelKey }) => (
          <li key={href}>
            <Link
              href={`/${locale}${href}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-5 py-4 text-primary transition-colors hover:bg-accent"
            >
              <span className="font-medium">{t(labelKey)}</span>
              <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.75} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function LegalPage() {
  return <LegalContent />
}
