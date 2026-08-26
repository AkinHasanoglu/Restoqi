/**
 * Shared cookie-consent state for both apps (dashboard + landing).
 *
 * Only gates *non-essential* cookies — analytics (PostHog). Strictly
 * necessary cookies (Supabase auth session, next-intl locale, this
 * consent choice itself) are exempt from consent under GDPR/ePrivacy and
 * are never blocked by a "reject" choice — rejecting never breaks the
 * product (no cookie wall, see compliance audit rule 40).
 *
 * Stored in both localStorage (read on next visit without a network
 * round-trip) and a cookie (so a server component could read it too, if
 * a future SSR-gated integration needs that). `notifyConsentChange`/
 * `onConsentChange` let an already-mounted provider (e.g.
 * apps/dashboard/src/components/posthog-provider.tsx) react immediately
 * when the banner is answered, without a full page reload.
 */

export type ConsentChoice = 'granted' | 'denied'

const STORAGE_KEY = 'sa_consent'
const COOKIE_NAME = 'sa_consent'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 // 1 year — re-ask annually, not forever.
const CONSENT_EVENT = 'sa-consent-change'

export function getStoredConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(STORAGE_KEY)
  return value === 'granted' || value === 'denied' ? value : null
}

export function setStoredConsent(choice: ConsentChoice): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, choice)
  document.cookie = `${COOKIE_NAME}=${choice}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
  window.dispatchEvent(new CustomEvent<ConsentChoice>(CONSENT_EVENT, { detail: choice }))
}

/** Subscribes to consent changes made elsewhere in the same tab (e.g. the banner). Returns an unsubscribe function. */
export function onConsentChange(callback: (choice: ConsentChoice) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const listener = (event: Event) => callback((event as CustomEvent<ConsentChoice>).detail)
  window.addEventListener(CONSENT_EVENT, listener)
  return () => window.removeEventListener(CONSENT_EVENT, listener)
}
