'use client'

import * as React from 'react'
import { Button } from './button'
import { getStoredConsent, setStoredConsent, type ConsentChoice } from '../lib/consent'

export interface CookieConsentBannerProps {
  title: string
  description: string
  acceptLabel: string
  rejectLabel: string
  learnMoreLabel?: string
  learnMoreHref?: string
  onChange?: (choice: ConsentChoice) => void
}

/**
 * Opt-in cookie/analytics consent banner — hidden once a choice is stored
 * (see ../lib/consent.ts), shown again if none is stored yet. Accept and
 * Reject are rendered with identical variant/size so neither is visually
 * steered as the "right" choice, and rejecting never hides or disables
 * any part of the app underneath it (compliance audit rules 12, 40 — no
 * cookie wall). Text is passed in translated from the caller rather than
 * read here, since this package doesn't depend on next-intl.
 */
export function CookieConsentBanner({
  title,
  description,
  acceptLabel,
  rejectLabel,
  learnMoreLabel,
  learnMoreHref,
  onChange,
}: CookieConsentBannerProps) {
  const [visible, setVisible] = React.useState(false)

  // Effect (not lazy useState init) — getStoredConsent() reads
  // localStorage, which doesn't exist during SSR/the first client render;
  // deferring to an effect avoids a hydration mismatch.
  React.useEffect(() => {
    setVisible(getStoredConsent() === null)
  }, [])

  function respond(choice: ConsentChoice) {
    setStoredConsent(choice)
    onChange?.(choice)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label={title}
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-card p-4 shadow-lg sm:p-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 text-sm">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-muted-foreground">
            {description}
            {learnMoreHref && learnMoreLabel ? (
              <>
                {' '}
                <a href={learnMoreHref} className="underline hover:text-foreground">
                  {learnMoreLabel}
                </a>
              </>
            ) : null}
          </p>
        </div>
        {/* Equal size/variant for both actions — see the no-dark-pattern note above. */}
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => respond('denied')}>
            {rejectLabel}
          </Button>
          <Button variant="outline" size="sm" onClick={() => respond('granted')}>
            {acceptLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
