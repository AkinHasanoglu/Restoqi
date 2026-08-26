'use client'

import { useTranslations, useFormatter } from 'next-intl'
import { Check, Sparkles, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Button, Badge } from '@stockalert/ui'
import { cn } from '@stockalert/ui'
import { PLAN_CONFIGS, TRIAL_DAYS, type PlanName, type PlanLimits } from '@stockalert/plans'
import { env } from '../../env'

// @stockalert/plans is the single source of truth for pricing — shared
// with apps/dashboard/src/lib/plan-limits.ts and the Paddle webhook's
// price map — so this page can't drift into showing a different number
// than what checkout and the billing page actually charge. Previously
// this component read its own price out of landing.json and applied an
// ad-hoc 20% annual discount client-side; the real annual prices
// (10x monthly, i.e. 2 months free) live in PLAN_CONFIGS now.
const PLANS: readonly PlanName[] = ['starter', 'growth', 'scale']

// Comparison table rows — every value below is read from PLAN_CONFIGS at
// render time (never hand-typed), so this table can't drift from what
// plan-limits.ts and the sync worker actually enforce.
const LIMIT_ROWS: readonly (keyof PlanLimits)[] = ['stores', 'products', 'rules', 'alertsPerMonth', 'seats']
// comparisonKey is the landing.pricing.comparison.* translation key;
// configField is the actual PLAN_CONFIGS boolean flag (named has* there).
const FEATURE_ROWS = [
  { comparisonKey: 'customThresholds', configField: 'hasCustomThresholds' },
  { comparisonKey: 'velocityPrediction', configField: 'hasVelocityPrediction' },
  { comparisonKey: 'csvExport', configField: 'hasCsvExport' },
] as const
const PRICING_FAQ = ['currency', 'planChange', 'cancel'] as const

/** Universal short labels, not per-locale copy — same reasoning as brand
 * names like "Slack" not needing translation. */
const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email', telegram: 'Telegram', slack: 'Slack', sms: 'SMS', webhook: 'Webhook', n8n: 'n8n',
}

export function Pricing() {
  const t = useTranslations('landing.pricing')
  // Number.prototype.toLocaleString() with no locale argument resolves the
  // *runtime's* default locale — Node's ICU default on the server, the
  // browser/OS locale on the client. Those can differ (e.g. server "en-US"
  // formats 2500 as "2,500", a browser set to a locale using "." as the
  // thousands separator renders "2.500"), which is a text mismatch React
  // treats as a hydration error. useFormatter() ties formatting to the
  // page's actual locale instead, so server and client always agree.
  const format = useFormatter()
  const dashboardUrl = env.NEXT_PUBLIC_APP_URL
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" className="py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-4xl sm:text-5xl">{t('title')}</h2>
          <p className="mt-5 text-lg text-muted-foreground">{t('subtitle')}</p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1.5">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                'rounded-full px-5 py-2 text-sm font-semibold transition-all',
                !annual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('monthly')}
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all',
                annual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('annual')}
              <span className="rounded-full bg-accent-2/15 px-2 py-0.5 text-[10px] font-bold text-accent-2">
                {t('save')}
              </span>
            </button>
          </div>

          <p className="mt-5 text-sm text-muted-foreground">{t('trialExplainer', { days: TRIAL_DAYS })}</p>
        </div>

        {/* Cards */}
        <div className="mt-12 grid gap-6 md:grid-cols-3 lg:gap-8">
          {PLANS.map((plan) => {
            const config = PLAN_CONFIGS[plan]
            const isPopular = plan === 'growth'
            const features = t.raw(`plans.${plan}.features`) as string[]
            // Annual is billed as a single yearly charge (yearlyPriceUSD),
            // not monthly x 12 — shown per-month here for comparability
            // with the monthly toggle, same as most SaaS pricing pages.
            const displayMonthly = annual ? Math.round(config.yearlyPriceUSD / 12) : config.monthlyPriceUSD

            return (
              <div
                key={plan}
                className={cn(
                  'relative flex flex-col rounded-3xl border bg-card p-7 transition-shadow',
                  isPopular
                    ? 'border-primary shadow-xl shadow-primary/10'
                    : 'border-border/60 hover:shadow-md'
                )}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25">
                      <Sparkles className="h-3 w-3" strokeWidth={2.75} />
                      {t('popular')}
                    </Badge>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <div className="mb-1 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {t(`plans.${plan}.name`)}
                  </div>
                  <p className="mb-5 text-sm text-muted-foreground">{t(`plans.${plan}.description`)}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-heading text-5xl">
                      ${displayMonthly}
                    </span>
                    <span className="text-sm text-muted-foreground">{t('perMonth')}</span>
                  </div>
                  {annual && (
                    <div className="mt-1.5 text-xs text-muted-foreground">
                      {t('billedAnnually', { yearly: config.yearlyPriceUSD, monthly: config.monthlyPriceUSD })}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="mb-5 h-px bg-border/50" />

                {/* Features */}
                <ul className="mb-8 flex-1 space-y-3">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-2" strokeWidth={2.75} />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={cn(
                    'w-full rounded-full font-semibold',
                    isPopular ? 'shadow-lg shadow-primary/20' : ''
                  )}
                  variant={isPopular ? 'default' : 'outline'}
                  size="lg"
                  asChild
                >
                  <a href={`${dashboardUrl}/signup?plan=${plan}${annual ? '&billing=annual' : ''}`}>
                    {t('startTrial')}
                  </a>
                </Button>
              </div>
            )
          })}
        </div>

        {/* Comparison table — every cell reads PLAN_CONFIGS directly, so it
            can't drift from the card copy above or from what the sync
            worker / plan-limits.ts actually enforce. */}
        <div className="mt-16">
          <h3 className="text-center font-heading text-2xl sm:text-3xl">{t('comparisonTitle')}</h3>
          <div className="mt-8 overflow-x-auto rounded-3xl border border-border/60 bg-card">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="p-4 text-left font-semibold text-muted-foreground"> </th>
                  {PLANS.map((plan) => (
                    <th key={plan} className="p-4 text-left font-heading text-base">
                      {t(`plans.${plan}.name`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LIMIT_ROWS.map((row) => (
                  <tr key={row} className="border-b border-border/30 last:border-0">
                    <td className="p-4 text-muted-foreground">{t(`comparison.${row}`)}</td>
                    {PLANS.map((plan) => {
                      const value = PLAN_CONFIGS[plan].limits[row]
                      return (
                        <td key={plan} className="p-4 font-medium">
                          {value < 0 ? t('comparison.unlimited') : format.number(value)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr className="border-b border-border/30">
                  <td className="p-4 text-muted-foreground">{t('comparison.channels')}</td>
                  {PLANS.map((plan) => (
                    <td key={plan} className="p-4 font-medium">
                      {PLAN_CONFIGS[plan].allowedChannels.map((c) => CHANNEL_LABELS[c] ?? c).join(', ')}
                    </td>
                  ))}
                </tr>
                {FEATURE_ROWS.map(({ comparisonKey, configField }) => (
                  <tr key={comparisonKey} className="border-b border-border/30 last:border-0">
                    <td className="p-4 text-muted-foreground">{t(`comparison.${comparisonKey}`)}</td>
                    {PLANS.map((plan) => (
                      <td key={plan} className="p-4 font-medium">
                        {PLAN_CONFIGS[plan][configField] ? (
                          <Check className="h-4 w-4 text-accent-2" strokeWidth={2.75} />
                        ) : (
                          <span className="text-muted-foreground/50">{t('comparison.no')}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mini FAQ */}
        <div className="mx-auto mt-16 flex max-w-2xl flex-col gap-2.5">
          {PRICING_FAQ.map((key) => (
            <PricingFaqItem key={key} question={t(`faq.${key}.q`)} answer={t(`faq.${key}.a`)} />
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingFaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left text-[15px] font-semibold"
        aria-expanded={open}
      >
        {question}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-primary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          strokeWidth={2.75}
        />
      </button>
      {open && <p className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">{answer}</p>}
    </div>
  )
}
