'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { CookieConsentBanner, getStoredConsent, onConsentChange } from '@stockalert/ui'

/**
 * PostHog only initializes after explicit opt-in — previously this called
 * posthog.init() unconditionally on every mount, setting analytics
 * cookies before the visitor had any say (compliance audit rules 12, 40:
 * GDPR/ePrivacy require consent *before* non-essential cookies are set,
 * not an after-the-fact opt-out). getStoredConsent()/onConsentChange come
 * from packages/ui/src/lib/consent.ts, shared with the landing app's
 * equivalent banner mount.
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
  const landingUrl = process.env['NEXT_PUBLIC_LANDING_URL'] ?? ''

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
        learnMoreHref={landingUrl ? `${landingUrl}/legal/cookies` : undefined}
      />
    </>
  )
}
