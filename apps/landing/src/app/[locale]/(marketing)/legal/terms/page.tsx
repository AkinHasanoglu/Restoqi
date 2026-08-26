import type { Metadata } from 'next'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { type Locale } from '@stockalert/i18n'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing.meta.legalTerms' })
  return { title: t('title'), description: t('description') }
}

// Keep in step with legal/privacy's POLICY_VERSION and
// apps/dashboard/src/actions/auth.ts's CURRENT_TERMS_VERSION.
const POLICY_VERSION = '2026-08-25'

// Structural draft, not reviewed by counsel — see the visible draftNotice
// banner below and the plan note this page was generated from. Kept in
// English only rather than machine-translated into 7 languages: the copy
// isn't binding yet, and translating placeholder legal text would need to
// be redone after legal review anyway.
const SECTIONS = [
  { heading: '1. Acceptance of terms', body: 'By creating a StockAlert account or connecting a store, you agree to these Terms of Service and to our Privacy Policy. The checkbox on the signup form records the exact time and version accepted.' },
  { heading: '2. The service', body: 'StockAlert monitors inventory levels on connected marketplaces (Shopify, Trendyol, Amazon, Etsy, eBay, Hepsiburada, AliExpress) and sends alerts when stock crosses thresholds you configure. It is a business tool for merchants and their teams — it is not directed at, and must not be used by, individual consumers or anyone under 18.' },
  { heading: '3. Accounts and plans', body: 'Your account is billed according to the plan (Starter, Growth or Scale) and billing interval (monthly or annual) selected at signup, through Paddle as our Merchant of Record. New accounts receive a 14-day trial of the Growth plan with no card required; when the trial ends without a paid subscription, the account switches to read-only rather than being deleted.' },
  { heading: '4. Digital content and withdrawal', body: 'StockAlert is a digital service that begins delivering value (inventory sync, alert evaluation) immediately once a paid plan starts. Where EU/UK consumer-rights law would otherwise grant a withdrawal period for digital content, starting a paid plan requires you to expressly acknowledge that you ask for immediate access and thereby waive that withdrawal right — the checkbox on the checkout page (Settings → Billing) records this acknowledgment before payment is taken.' },
  { heading: '5. Acceptable use', body: "You won't use StockAlert to access marketplace data you're not authorized to access, to attempt to circumvent plan limits or rate limits, or to resell the service without a separate agreement." },
  { heading: '6. Data ownership', body: "You retain ownership of your store and inventory data. We process it only to provide the service — see the Privacy Policy and Data Processing Agreement for details." },
  { heading: '7. Termination', body: 'You may cancel at any time from Settings → Billing, in the same number of steps it took to subscribe — no phone call or support request required. Access continues until the end of the current billing period; your data is retained, not deleted, after cancellation, and you can export or permanently delete it yourself at any time (Settings → Account).' },
  { heading: '8. Changes', body: 'We may update these terms; material changes will be communicated by email before taking effect. The version and effective date below identify exactly which terms you agreed to.' },
] as const

function TermsContent() {
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

      <h1 className="mt-8 text-3xl font-bold">{t('footer.terms')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('legal.lastUpdated')}: {POLICY_VERSION}
      </p>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.heading}>
            <h2 className="text-lg font-semibold">{s.heading}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  )
}

export default function TermsPage() {
  return <TermsContent />
}
