import {
  Body, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'
import * as React from 'react'
import { getEmailTranslator, defaultLocale, type Locale } from '../i18n'
import { EmailHeader } from '../components/email-header'
import { EmailFooter } from '../components/email-footer'

interface PasswordResetEmailProps {
  locale?: Locale
  resetUrl: string
  expiresInMinutes?: number
  logoUrl?: string
  companyAddress?: string
}

export function PasswordResetEmail({
  locale = defaultLocale,
  resetUrl = 'https://app.example.com/reset-password',
  expiresInMinutes = 60,
  logoUrl,
  companyAddress,
}: PasswordResetEmailProps) {
  const t = getEmailTranslator(locale)

  return (
    <Html>
      <Head />
      <Preview>{t('passwordReset.preview')}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader logoUrl={logoUrl} />
          <Heading style={h1}>{t('passwordReset.heading')}</Heading>
          <Text style={text}>{t('passwordReset.body')}</Text>
          <Link href={resetUrl} style={button}>{t('passwordReset.cta')} →</Link>
          <Text style={footer}>{t('passwordReset.expiry', { minutes: expiresInMinutes })}</Text>
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
const footer = { color: '#8898aa', fontSize: '12px', padding: '0 48px' }
