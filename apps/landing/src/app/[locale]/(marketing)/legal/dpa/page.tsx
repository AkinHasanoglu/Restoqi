import type { Metadata } from 'next'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { type Locale } from '@stockalert/i18n'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing.meta.legalDpa' })
  return { title: t('title'), description: t('description') }
}

// Keep in step with legal/privacy's POLICY_VERSION and
// apps/dashboard/src/actions/auth.ts's CURRENT_TERMS_VERSION.
const POLICY_VERSION = '2026-08-25'

// Structural draft, not reviewed by counsel — see the visible draftNotice
// banner below. English only; see legal/terms/page.tsx for why.
const SECTIONS = [
  { heading: '1. Roles', body: 'For personal data contained in the marketplace inventory feeds you connect, you (the customer) act as data controller and StockAlert acts as data processor.' },
  { heading: '2. Subject matter and duration', body: 'Processing covers inventory sync, alert evaluation and delivery, optional AI-assisted stockout prediction (only when you configure your own provider key — see the Privacy Policy §3), and account/billing administration, for as long as your account remains active plus any post-cancellation retention period described in the Privacy Policy.' },
  {
    heading: '3. Sub-processors',
    body: 'The following sub-processors are engaged, each limited to the function listed. See the full sub-processor registry for regions and contract basis. We’ll give notice before adding a new sub-processor with access to customer data, so DPA-holding customers can object or plan around it.',
    items: [
      'Supabase — database hosting and authentication',
      'Vercel — application hosting and edge network',
      'Paddle — payments, as Merchant of Record',
      'Resend — transactional and digest email delivery',
      'Sentry — error monitoring (PII-scrubbed before leaving our servers)',
      'PostHog — product analytics (only after cookie consent)',
      'Upstash — rate-limiting and background-job infrastructure',
      'Anthropic / OpenAI — only if you configure your own API key',
      'Twilio — only if you enable SMS alerts',
    ],
  },
  { heading: '4. Security measures', body: 'Row-level security per team (independently verified by an automated integration test suite), AES-256-GCM encryption of stored marketplace credentials and AI provider keys, nonce-based Content-Security-Policy and bot protection (Cloudflare Turnstile) on public auth endpoints, rate limiting on every public and authenticated API route, and continuous error monitoring — see the Trust section on the homepage for the full list.' },
  {
    heading: '5. Data subject requests',
    body: 'Most data subject requests are self-service and don’t require contacting us at all — see Privacy Policy §8. Where we do need to assist (e.g. a request routed to you as controller), we’ll help you respond to access, correction or deletion requests to the extent required by applicable law, including within GDPR’s response timelines.',
  },
  { heading: '6. International transfers', body: 'Sub-processors may process data outside your region; where required, transfers rely on their respective Standard Contractual Clauses or an equivalent recognized safeguard (e.g. the EU-US Data Privacy Framework, for sub-processors certified under it).' },
  { heading: '7. Breach notification', body: 'In the event of a personal data breach affecting your data, we will notify you without undue delay and in any case within 72 hours of becoming aware of it, per our internal incident response runbook, including what happened, what data was affected, and what we’re doing about it.' },
] as const

function DpaContent() {
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

      <h1 className="mt-8 text-3xl font-bold">{t('footer.dpa')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('legal.lastUpdated')}: {POLICY_VERSION}
      </p>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.heading}>
            <h2 className="text-lg font-semibold">{s.heading}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
            {'items' in s && s.items ? (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-muted-foreground">
                {s.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  )
}

export default function DpaPage() {
  return <DpaContent />
}
