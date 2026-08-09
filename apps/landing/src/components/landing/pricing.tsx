'use client'

import { useTranslations } from 'next-intl'
import { Check, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Button, Badge } from '@stockalert/ui'
import { cn } from '@stockalert/ui'
import { env } from '../../env'

const PLANS = ['starter', 'business', 'enterprise'] as const

export function Pricing() {
  const t = useTranslations('landing.pricing')
  const dashboardUrl = env.NEXT_PUBLIC_APP_URL
  const [annual, setAnnual] = useState(false)

  const getPrice = (base: string) => {
    if (base === 'Custom') return base
    const monthly = parseInt(base)
    return annual ? String(Math.round(monthly * 0.8)) : base
  }

  return (
    <section id="pricing" className="py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{t('title')}</h2>
          <p className="mt-5 text-lg text-muted-foreground">{t('subtitle')}</p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-1.5">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                'rounded-lg px-5 py-2 text-sm font-medium transition-all',
                !annual ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('monthly')}
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all',
                annual ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('annual')}
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {t('save')}
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="mt-12 grid gap-6 md:grid-cols-3 lg:gap-8">
          {PLANS.map((plan) => {
            const isBusiness = plan === 'business'
            const features = t.raw(`plans.${plan}.features`) as string[]
            const rawPrice = t(`plans.${plan}.price`)
            const price = getPrice(rawPrice)

            return (
              <div
                key={plan}
                className={cn(
                  'relative flex flex-col rounded-2xl border bg-card p-7 transition-shadow',
                  isBusiness
                    ? 'border-primary/40 shadow-xl shadow-primary/8 ring-1 ring-primary/20'
                    : 'border-border/60 hover:shadow-md'
                )}
              >
                {isBusiness && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold shadow-lg shadow-primary/25">
                      <Sparkles className="h-3 w-3" />
                      {t('popular')}
                    </Badge>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <div className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {t(`plans.${plan}.name`)}
                  </div>
                  <p className="mb-5 text-sm text-muted-foreground">{t(`plans.${plan}.description`)}</p>
                  <div className="flex items-baseline gap-1">
                    {plan !== 'enterprise' ? (
                      <>
                        <span className="font-mono text-5xl font-extrabold tracking-tight">
                          ${price}
                        </span>
                        <span className="text-sm text-muted-foreground">{t('perMonth')}</span>
                      </>
                    ) : (
                      <span className="font-mono text-4xl font-extrabold tracking-tight">
                        {t(`plans.${plan}.price`)}
                      </span>
                    )}
                  </div>
                  {annual && plan !== 'enterprise' && (
                    <div className="mt-1.5 text-xs text-muted-foreground">
                      Billed annually · was ${rawPrice}/mo
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="mb-5 h-px bg-border/50" />

                {/* Features */}
                <ul className="mb-8 flex-1 space-y-3">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={cn(
                    'w-full rounded-xl font-semibold',
                    isBusiness ? 'shadow-lg shadow-primary/20' : ''
                  )}
                  variant={isBusiness ? 'default' : 'outline'}
                  size="lg"
                  asChild
                >
                  <a
                    href={
                      plan === 'enterprise'
                        ? '#contact'
                        : `${dashboardUrl}/signup?plan=${plan}${annual ? '&billing=annual' : ''}`
                    }
                  >
                    {plan === 'enterprise' ? t('contactSales') : t('startTrial')}
                  </a>
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
