import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Text,
} from '@react-email/components'
import * as React from 'react'
import { getEmailTranslator, defaultLocale, type Locale } from '../i18n'
import { EmailHeader } from '../components/email-header'
import { EmailFooter } from '../components/email-footer'

export interface TrialReminderEmailProps {
  locale?: Locale
  teamName: string
  daysLeft: number
  billingUrl: string
  logoUrl?: string
  companyAddress?: string
}

/**
 * Sent ~3 days before a team's trial ends — compliance audit rule 09
 * (auto-renewal/trial-end reminders). Genuinely transactional account
 * notice, not marketing, so no unsubscribe link.
 */
export function TrialReminderEmail({
  locale = defaultLocale,
  teamName = 'My Team',
  daysLeft = 3,
  billingUrl = 'https://app.example.com/settings/billing',
  logoUrl,
  companyAddress,
}: TrialReminderEmailProps) {
  const t = getEmailTranslator(locale)

  return (
    <Html>
      <Head />
      <Preview>{t('trialReminder.preview', { daysLeft })}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader logoUrl={logoUrl} />
          <Heading style={h1}>{t('trialReminder.heading', { daysLeft })}</Heading>
          <Text style={text}>{t('trialReminder.body', { teamName })}</Text>
          <Text style={text}>{t('trialReminder.note')}</Text>
          <Link href={billingUrl} style={button}>
            {t('trialReminder.cta')} →
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
