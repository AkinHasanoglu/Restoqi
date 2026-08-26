import type { Metadata } from 'next'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { type Locale } from '@stockalert/i18n'
import { env } from '../../../../../env'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing.meta.legalSubprocessors' })
  return { title: t('title'), description: t('description') }
}

// Keep in step with legal/privacy's §4 and legal/dpa's §3 — this page is
// the canonical, most detailed version; the policy pages summarize and
// link here (compliance audit rule 36: an accessible, dedicated
// sub-processor registry with a way to be notified of changes).
const POLICY_VERSION = '2026-08-25'

const SUBPROCESSORS = [
  { name: 'Supabase', purpose: 'Database hosting, authentication, row-level security', region: 'Configured Supabase project region — see your project settings' },
  { name: 'Vercel', purpose: 'Application hosting, edge network, cron scheduling', region: 'Global edge network (US-headquartered)' },
  { name: 'Paddle', purpose: 'Billing, as Merchant of Record — handles card data and tax', region: 'UK / EU' },
  { name: 'Resend', purpose: 'Transactional and weekly digest email delivery', region: 'US' },
  { name: 'Sentry', purpose: 'Error monitoring (PII scrubbed before leaving our servers)', region: 'US / EU (project-configurable)' },
  { name: 'PostHog', purpose: 'Product analytics — only loaded after cookie consent is accepted', region: 'US / EU (project-configurable)' },
  { name: 'Upstash', purpose: 'Rate limiting and background-job queue infrastructure', region: 'Configurable per deployment' },
  { name: 'Cloudflare', purpose: 'Turnstile bot protection on public authentication forms', region: 'Global edge network' },
  { name: 'Anthropic', purpose: 'AI-assisted stockout prediction — only if you configure your own API key', region: 'US' },
  { name: 'OpenAI', purpose: 'AI-assisted stockout prediction — only if you configure your own API key', region: 'US' },
  { name: 'Twilio', purpose: 'SMS delivery — only if you enable SMS alerts', region: 'US' },
] as const

function SubprocessorsContent() {
  const t = useTranslations('landing')
  const locale = useLocale() as Locale
  const supportEmail = env.NEXT_PUBLIC_SUPPORT_EMAIL

  return (
    <div className="mx-auto max-w-3xl px-4 py-32">
      <Link href={`/${locale}/legal`} className="text-sm text-primary hover:underline">
        ← {t('legal.backToLegal')}
      </Link>

      <div className="mt-6 rounded-2xl border border-warning/40 bg-warning/10 px-5 py-3 text-sm text-warning-foreground">
        {t('legal.draftNotice')}
      </div>

      <h1 className="mt-8 text-3xl font-bold">Sub-processors</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('legal.lastUpdated')}: {POLICY_VERSION}
      </p>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        These are the only third parties with access to any customer data, each limited to the purpose
        listed. See the Privacy Policy and Data Processing Agreement for how each transfer is safeguarded.
        We'll update this page and email DPA-holding customers before adding a new sub-processor with
        access to customer data.
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border/60">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Sub-processor</th>
              <th className="px-4 py-3 font-semibold">Purpose</th>
              <th className="px-4 py-3 font-semibold">Region</th>
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map((p) => (
              <tr key={p.name} className="border-t border-border/60">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.purpose}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.region}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {supportEmail ? (
        <p className="mt-8 text-[15px] leading-relaxed text-muted-foreground">
          To be notified by email before we add a new sub-processor, contact{' '}
          <a href={`mailto:${supportEmail}`} className="underline hover:text-foreground">
            {supportEmail}
          </a>{' '}
          with your company name and we'll add you to the notification list.
        </p>
      ) : null}
    </div>
  )
}

export default function SubprocessorsPage() {
  return <SubprocessorsContent />
}
