import { useTranslations } from 'next-intl'
import { ShieldCheck, ScrollText, KeyRound, Gauge, Activity, CreditCard } from 'lucide-react'

const TRUST_ITEMS = [
  { key: 'dataIsolation', Icon: ShieldCheck },
  { key: 'auditTrail', Icon: ScrollText },
  { key: 'encryptedCredentials', Icon: KeyRound },
  { key: 'rateLimiting', Icon: Gauge },
  { key: 'errorTracking', Icon: Activity },
  { key: 'billing', Icon: CreditCard },
] as const

// Each claim here maps to something real in the codebase (RLS policies,
// logAudit(), encrypted store credentials, rate-limit.ts + Turnstile,
// Sentry, Paddle as Merchant of Record) — no invented certifications or
// badges, see docs/... plan notes for the source of each line.
export function Trust() {
  const t = useTranslations('landing.trust')

  return (
    <section className="py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-4xl sm:text-5xl">{t('title')}</h2>
          <p className="mt-5 text-lg text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST_ITEMS.map(({ key, Icon }) => (
            <div
              key={key}
              className="rounded-3xl border border-border/50 bg-card p-6"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-2/15">
                <Icon className="h-5 w-5 text-accent-2" strokeWidth={2.75} />
              </div>
              <h3 className="mb-2 text-[16px] font-semibold leading-snug">{t(`items.${key}.title`)}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{t(`items.${key}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
