'use client'

import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button } from '@stockalert/ui'
import type { Locale } from '@stockalert/i18n'

interface TrialBannerProps {
  trialDaysLeft: number
}

/** Rendered in AppShell only while resolveEffectivePlan (@stockalert/plans) reports isTrialActive — see the (app)/layout.tsx server component that computes it. */
export function TrialBanner({ trialDaysLeft }: TrialBannerProps) {
  const t = useTranslations('dashboard.trial.banner')
  const locale = useLocale() as Locale

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-warning/30 bg-warning px-4 py-2 text-center text-sm font-medium text-warning-foreground sm:justify-between sm:px-6">
      <span>{t('message', { days: trialDaysLeft })}</span>
      <Button asChild size="sm" variant="secondary" className="h-7 shrink-0 px-3 text-xs">
        <Link href={`/${locale}/settings/billing`}>{t('cta')}</Link>
      </Button>
    </div>
  )
}
