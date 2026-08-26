import type { Metadata } from 'next'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { type Locale } from '@stockalert/i18n'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing.meta.legalCookies' })
  return { title: t('title'), description: t('description') }
}

// Keep in step with legal/privacy's §6. Compliance audit rules 12, 40 —
// this is what the cookie banner's "Cookie Policy" link points to
// (packages/ui/src/components/cookie-consent.tsx).
const POLICY_VERSION = '2026-08-25'

const COOKIE_CATEGORIES = [
  {
    name: 'Strictly necessary',
    consentRequired: 'Always on — exempt from consent under GDPR/ePrivacy',
    examples: 'Supabase session cookie (keeps you signed in), your language preference, and the sa_consent cookie that remembers your choice on this page.',
    retention: 'Session or up to 1 year',
  },
  {
    name: 'Analytics',
    consentRequired: 'Off until you accept',
    examples: 'PostHog — page views and product usage, to understand which features matter.',
    retention: 'Up to 1 year, cleared if you later reject',
  },
] as const

function CookiesContent() {
  const t = useTranslations('landing')
  const locale = useLocale() as Locale

  return (
    <div className="mx-auto max-w-3xl px-4 py-32">
      <Link href={`/${locale}/legal`} className="text-sm text-primary hover:underline">
        ← {t('legal.backToLegal')}
      </Link>

      <div className="mt-6 rounded-2xl border border-warning/40 bg-warning/10 px-5 py-3 text-sm text-warning-foreground">
        {t('legal.draftNotice')}
      </div>

      <h1 className="mt-8 text-3xl font-bold">Cookie Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('legal.lastUpdated')}: {POLICY_VERSION}
      </p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-muted-foreground">
        <p>
          We ask before setting any cookie that isn't strictly necessary to run the site. Analytics
          cookies stay off until you click "Accept all" on the banner shown on your first visit —
          clicking "Reject all" is just as easy and never restricts any part of the product (there is
          no cookie wall).
        </p>

        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Consent</th>
                <th className="px-4 py-3 font-semibold">Examples</th>
                <th className="px-4 py-3 font-semibold">Retention</th>
              </tr>
            </thead>
            <tbody>
              {COOKIE_CATEGORIES.map((c) => (
                <tr key={c.name} className="border-t border-border/60 align-top">
                  <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-3">{c.consentRequired}</td>
                  <td className="px-4 py-3">{c.examples}</td>
                  <td className="px-4 py-3">{c.retention}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p>
          To change your choice, clear the <code className="rounded bg-muted px-1 py-0.5 text-xs">sa_consent</code>{' '}
          cookie and this site's local storage for this domain (usually via your browser's site-settings
          panel) — the banner will reappear on your next page load.
        </p>
      </div>
    </div>
  )
}

export default function CookiesPage() {
  return <CookiesContent />
}
