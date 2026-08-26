import { Link, Section, Text } from '@react-email/components'
import * as React from 'react'

export interface EmailFooterProps {
  /** Plain-text footer line, already localized by the caller (getEmailTranslator's `common.footer`). */
  footerText: string
  /**
   * CAN-SPAM's required physical postal address — set via
   * NEXT_PUBLIC_COMPANY_ADDRESS (see apps/dashboard/src/env/index.ts).
   * Omitted rather than faked when unset; see the compliance audit's
   * rule 14 note for why this is a placeholder-shaped env var rather
   * than a hardcoded value only this file would need to know about.
   */
  companyAddress?: string
  /**
   * One-click unsubscribe link for non-transactional sends (currently
   * just the weekly digest — see packages/notifications/src/channels/
   * transactional.ts's sendWeeklyDigestEmail). Omitted for genuinely
   * transactional mail (invites, password resets, payment failures),
   * which CAN-SPAM doesn't require or even want unsubscribable.
   */
  unsubscribeUrl?: string
  unsubscribeLabel?: string
}

/** Dropped at the bottom of every email template, below the existing per-template footer text. */
export function EmailFooter({ footerText, companyAddress, unsubscribeUrl, unsubscribeLabel }: EmailFooterProps) {
  return (
    <Section style={section}>
      <Text style={text}>{footerText}</Text>
      {companyAddress ? <Text style={text}>{companyAddress}</Text> : null}
      {unsubscribeUrl ? (
        <Text style={text}>
          <Link href={unsubscribeUrl} style={link}>
            {unsubscribeLabel ?? 'Unsubscribe'}
          </Link>
        </Text>
      ) : null}
    </Section>
  )
}

const section = { padding: '0 48px' }
const text = { color: '#8898aa', fontSize: '12px', margin: '4px 0' }
const link = { color: '#8898aa', textDecoration: 'underline' }
