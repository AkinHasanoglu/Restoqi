import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Text,
} from '@react-email/components'
import * as React from 'react'
import { getEmailTranslator, defaultLocale, type Locale } from '../i18n'
import { EmailHeader } from '../components/email-header'
import { EmailFooter } from '../components/email-footer'

export interface PolicyUpdateEmailProps {
  locale?: Locale
  /** e.g. "Privacy Policy", "Terms of Service" — whichever legal page changed. */
  policyName: string
  /** The page's POLICY_VERSION / effective date, e.g. "2026-08-25". */
  effectiveDate: string
  policyUrl: string
  logoUrl?: string
  companyAddress?: string
}

/**
 * Sent to every registered user before a material change to a legal
 * document takes effect — compliance audit rule 30. This is genuinely
 * transactional/legal notice, not marketing, so it carries no
 * unsubscribe link (CAN-SPAM exempts transactional and legally-required
 * messages from the opt-out requirement).
 */
export function PolicyUpdateEmail({
  locale = defaultLocale,
  policyName = 'Privacy Policy',
  effectiveDate = '2026-08-25',
  policyUrl = 'https://stockalert.app/legal/privacy',
  logoUrl,
  companyAddress,
}: PolicyUpdateEmailProps) {
  const t = getEmailTranslator(locale)

  return (
    <Html>
      <Head />
      <Preview>{t('policyUpdate.preview', { policyName })}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader logoUrl={logoUrl} />
          <Heading style={h1}>{t('policyUpdate.heading', { policyName })}</Heading>
          <Text style={text}>{t('policyUpdate.body', { policyName, effectiveDate })}</Text>
          <Link href={policyUrl} style={button}>
            {t('policyUpdate.cta', { policyName })} →
          </Link>
          <Hr style={hr} />
          <EmailFooter footerText={t('common.footer')} companyAddress={companyAddress} />
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '20px 0 48px', maxWidth: '580px' }
const h1 = { color: '#333', fontSize: '24px', fontWeight: '700', padding: '0 48px' }
const text = { color: '#333', fontSize: '16px', lineHeight: '26px', padding: '0 48px' }
const button = { backgroundColor: '#0f172a', borderRadius: '6px', color: '#fff', display: 'inline-block', fontSize: '14px', fontWeight: '600', padding: '12px 24px', textDecoration: 'none', margin: '16px 48px' }
const hr = { borderColor: '#e6ebf1', margin: '20px 48px' }
