import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'
import { getEmailTranslator, defaultLocale, type Locale } from '../i18n'
import { EmailHeader } from '../components/email-header'
import { EmailFooter } from '../components/email-footer'

interface PaymentFailedEmailProps {
  locale?: Locale
  teamName: string
  updatePaymentUrl: string
  logoUrl?: string
  companyAddress?: string
}

export function PaymentFailedEmail({
  locale = defaultLocale,
  teamName = 'My Team',
  updatePaymentUrl = 'https://app.example.com/settings/billing',
  logoUrl,
  companyAddress,
}: PaymentFailedEmailProps) {
  const t = getEmailTranslator(locale)

  return (
    <Html>
      <Head />
      <Preview>{t('paymentFailed.preview')}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader logoUrl={logoUrl} />
          <Heading style={h1}>{t('paymentFailed.heading')}</Heading>
          <Text style={text}>{t('paymentFailed.body', { teamName })}</Text>
          <Section style={alertBox}>
            <Text style={alertText}>{t('paymentFailed.retryNote')}</Text>
          </Section>
          <Link href={updatePaymentUrl} style={button}>{t('paymentFailed.cta')} →</Link>
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
const alertBox = { backgroundColor: '#fee2e2', borderRadius: '8px', margin: '24px 48px', padding: '16px' }
const alertText = { color: '#991b1b', fontSize: '14px', margin: '0', lineHeight: '20px' }
const button = { backgroundColor: '#0f172a', borderRadius: '6px', color: '#fff', display: 'inline-block', fontSize: '14px', fontWeight: '600', padding: '12px 24px', textDecoration: 'none', margin: '16px 48px' }
const hr = { borderColor: '#e6ebf1', margin: '20px 48px' }
