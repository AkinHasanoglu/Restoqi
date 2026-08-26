import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Text,
} from '@react-email/components'
import * as React from 'react'
import { getEmailTranslator, defaultLocale, type Locale } from '../i18n'
import { EmailHeader } from '../components/email-header'
import { EmailFooter } from '../components/email-footer'

interface InviteAcceptedEmailProps {
  locale?: Locale
  memberName: string
  memberEmail: string
  teamName: string
  teamUrl: string
  logoUrl?: string
  companyAddress?: string
}

export function InviteAcceptedEmail({
  locale = defaultLocale,
  memberName = 'A new teammate',
  memberEmail = 'teammate@example.com',
  teamName = 'My Team',
  teamUrl = 'https://app.example.com/settings/team',
  logoUrl,
  companyAddress,
}: InviteAcceptedEmailProps) {
  const t = getEmailTranslator(locale)

  return (
    <Html>
      <Head />
      <Preview>{t('inviteAccepted.preview', { memberName })}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader logoUrl={logoUrl} />
          <Heading style={h1}>{t('inviteAccepted.heading')}</Heading>
          <Text style={text}>{t('inviteAccepted.body', { memberName, memberEmail, teamName })}</Text>
          <Link href={teamUrl} style={button}>{t('inviteAccepted.cta')} →</Link>
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
