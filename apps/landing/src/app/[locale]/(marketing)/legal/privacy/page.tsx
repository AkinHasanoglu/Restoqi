import type { Metadata } from 'next'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { type Locale } from '@stockalert/i18n'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing.meta.legalPrivacy' })
  return { title: t('title'), description: t('description') }
}

// Bump alongside apps/dashboard/src/actions/auth.ts's CURRENT_TERMS_VERSION
// and legal/terms's own POLICY_VERSION whenever a section here materially
// changes — compliance audit rule 30 (users must be notified of material
// changes before they take effect; packages/emails/src/templates/
// policy-update.tsx is the notification for that).
const POLICY_VERSION = '2026-08-25'

// Structural draft, not reviewed by counsel — see the visible draftNotice
// banner below. English only; see legal/terms/page.tsx for why.
const SECTIONS = [
  {
    heading: '1. What we collect',
    body: 'Every category of personal data StockAlert stores, matched to what it’s actually used for:',
    items: [
      'Account & team data — your name, email, and the teams/roles you belong to.',
      'Store connections — which marketplace platforms you’ve connected, store name/domain, and sync status. API credentials for each store are encrypted at rest (AES-256-GCM) and are never visible in plaintext, even to us.',
      'Product & inventory data pulled from your connected stores — titles, SKUs, barcodes, images, and quantity history. Never marketplace customer PII beyond what the inventory API itself exposes.',
      'Alerting configuration — the rules, thresholds and notification channels (email, SMS, Slack, Telegram, webhook) you set up, and a log of alerts triggered and delivered.',
      'AI-assisted stockout predictions — only if you configure your own AI provider key; see §3 below.',
      'Billing status — your plan and subscription state. Payment card details are held by Paddle, our payment provider, never by us; see §4.',
      'Team notes — free-text notes your team chooses to store in the app.',
      'Usage counters and an audit trail of account actions (who changed what, and when) — visible to you in Settings → Audit.',
      'Technical data — error reports (Sentry) and, only after you accept the cookie banner, product analytics (PostHog).',
    ],
  },
  {
    heading: '2. How we use it',
    body: 'To sync inventory, evaluate your alert rules, send notifications through the channels you configure, and show usage on your billing page. We do not sell your data, and we do not use it for advertising.',
  },
  {
    heading: '3. AI-assisted predictions',
    body: 'Stockout predictions are computed statistically by default — no external AI call is made. If you add your own Anthropic or OpenAI API key in Settings → API Keys ("bring your own key"), the product’s title and its recent inventory-quantity history are sent to whichever provider you configured, solely to generate that prediction. We never send this data to a provider you haven’t configured, and we never send marketplace customer data to any AI provider. Per Anthropic’s and OpenAI’s commercial API terms, data submitted through their APIs (as opposed to their free consumer chat products) is not used to train their models. Removing a stored key stops this processing immediately.',
  },
  {
    heading: '4. Sub-processors',
    body: 'Companies that process data on our behalf, and only for the purpose listed. See the full sub-processor registry for regions and contract basis, with a way to be notified before we add a new one.',
    items: [
      'Supabase — database hosting and authentication.',
      'Vercel — application hosting and edge network.',
      'Paddle — billing, as Merchant of Record; handles card data and tax so we never see full card numbers.',
      'Resend — transactional email and weekly digest delivery.',
      'Sentry — error monitoring; personal data is scrubbed from error reports before they leave our servers.',
      'PostHog — product analytics, loaded only after you accept the cookie banner.',
      'Upstash — rate-limiting and background-job infrastructure; does not store personal content.',
      'Anthropic / OpenAI — only if you configure your own API key; see §3.',
      'Twilio — only if you enable SMS alerts.',
    ],
  },
  {
    heading: '5. Storage, isolation and cross-border transfers',
    body: 'Data is stored in Supabase (PostgreSQL) with row-level security enforcing per-team isolation — no team can query another team’s rows, independently verified by an automated test suite. Marketplace API credentials and AI provider keys are encrypted at rest with AES-256-GCM before they ever reach the database. Where a sub-processor operates outside your region, the transfer relies on that provider’s Standard Contractual Clauses or an equivalent safeguard — see our Data Processing Agreement for the mechanism each one uses.',
  },
  {
    heading: '6. Cookies and analytics',
    body: 'We use strictly necessary cookies to keep you signed in and remember your language. Analytics cookies (PostHog) are off by default and only start after you explicitly accept them in the cookie banner — rejecting them doesn’t restrict any part of the product. See our Cookie Policy for the full list and how to change your choice at any time.',
  },
  {
    heading: '7. Retention',
    body: 'Raw inventory-snapshot history is kept for 90 days, triggered alerts for 12 months, and audit log entries for 24 months, after which they’re automatically purged by a scheduled job. Current stock levels, products, rules and account data are retained for as long as your account is active. Cancelling a subscription switches the account to read-only rather than deleting anything — see §8 for how to delete it yourself whenever you’re ready.',
  },
  {
    heading: '8. Your rights',
    body: 'You don’t need to file a request or wait on us for the basics — they’re self-service, right in the product:',
    items: [
      'Access & export — Settings → Account → "Export my data" downloads everything StockAlert holds about you and your teams as JSON.',
      'Deletion — the same page’s Danger Zone lets you delete a team you own, or your entire account, immediately and permanently.',
      'Correction — update your name and account details directly in Settings → Account.',
    ],
  },
  {
    heading: '9. Policy changes',
    body: 'We’ll email every registered user before a material change to this policy takes effect. The version and effective date below identify exactly which policy you’re reading.',
  },
  {
    heading: '10. Contact',
    body: 'For anything not covered by the self-service tools above — or a data subject request you’d rather we handle directly — reach us via Contact.',
  },
] as const

function PrivacyContent() {
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

      <h1 className="mt-8 text-3xl font-bold">{t('footer.privacy')}</h1>
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

export default function PrivacyPage() {
  return <PrivacyContent />
}
