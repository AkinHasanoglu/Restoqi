'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { CookieConsentBanner, getStoredConsent, onConsentChange } from '@stockalert/ui'
import { type Locale } from '@stockalert/i18n'

/**
 * posthog-js is a declared dependency (see package.json) and
 * NEXT_PUBLIC_POSTHOG_KEY/HOST are already wired through env/index.ts,
 * but nothing on the landing site ever called posthog.init() — this
 * mounts the same consent-gated initialization used in
 * apps/dashboard/src/components/posthog-provider.tsx so that whenever
 * analytics is turned on here, it starts compliant (opt-in, not
 * opt-out) rather than needing this fixed retroactively. See compliance
 * audit rules 12, 40.
 */
function applyConsent(granted: boolean) {
  const key = process.env['NEXT_PUBLIC_POSTHOG_KEY']
  if (!key || typeof window === 'undefined') return

  if (granted) {
    if (!posthog.__loaded) {
      posthog.init(key, {
        api_host: process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://app.posthog.com',
        capture_pageview: true,
        capture_pageleave: true,
      })
    } else {
      posthog.opt_in_capturing()
    }
  } else if (posthog.__loaded) {
    posthog.opt_out_capturing()
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations('common')
  const locale = useLocale() as Locale

  useEffect(() => {
    const stored = getStoredConsent()
    if (stored) applyConsent(stored === 'granted')
    return onConsentChange((choice) => applyConsent(choice === 'granted'))
  }, [])

  return (
    <>
      {children}
      <CookieConsentBanner
        title={t('cookieConsent.title')}
        description={t('cookieConsent.description')}
        acceptLabel={t('cookieConsent.accept')}
        rejectLabel={t('cookieConsent.reject')}
        learnMoreLabel={t('cookieConsent.learnMore')}
        learnMoreHref={`/${locale}/legal/cookies`}
      />
    </>
  )
}
