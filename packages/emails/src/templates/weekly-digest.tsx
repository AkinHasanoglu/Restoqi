import {
  Body, Column, Container, Head, Heading, Hr, Html, Link, Preview, Row, Section, Text,
} from '@react-email/components'
import * as React from 'react'
import { getEmailTranslator, defaultLocale, type Locale } from '../i18n'
import { EmailHeader } from '../components/email-header'
import { EmailFooter } from '../components/email-footer'

export interface AtRiskProduct {
  title: string
  currentQuantity: number
}

interface WeeklyDigestEmailProps {
  locale?: Locale
  teamName: string
  trackedProductCount: number
  alertCount: number
  topAtRisk: AtRiskProduct[]
  dashboardUrl: string
  logoUrl?: string
  companyAddress?: string
  /** api/unsubscribe?token=... — this is the only periodic/non-transactional send in the product; see compliance audit rule 14. */
  unsubscribeUrl?: string
}

export function WeeklyDigestEmail({
  locale = defaultLocale,
  teamName = 'My Team',
  trackedProductCount = 0,
  alertCount = 0,
  topAtRisk = [],
  dashboardUrl = 'https://app.example.com/overview',
  logoUrl,
  companyAddress,
  unsubscribeUrl,
}: WeeklyDigestEmailProps) {
  const t = getEmailTranslator(locale)

  return (
    <Html>
      <Head />
      <Preview>{t('weeklyDigest.preview', { alertCount, productCount: trackedProductCount })}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader logoUrl={logoUrl} />
          <Heading style={h1}>{t('weeklyDigest.heading')}</Heading>
          <Text style={text}>{t('weeklyDigest.intro')} ({teamName})</Text>
          <Section style={statsRow}>
            <Row>
              <Column style={statCell}>
                <Text style={statValue}>{String(trackedProductCount)}</Text>
                <Text style={statLabel}>{t('weeklyDigest.trackedProducts')}</Text>
              </Column>
              <Column style={statCell}>
                <Text style={statValue}>{String(alertCount)}</Text>
                <Text style={statLabel}>{t('weeklyDigest.alertsTriggered')}</Text>
              </Column>
            </Row>
          </Section>
          {topAtRisk.length > 0 && (
            <>
              <Text style={sectionLabel}>{t('weeklyDigest.topAtRisk')}</Text>
              {topAtRisk.map((p) => (
                <Text key={p.title} style={listItem}>
                  {p.title} — <strong>{String(p.currentQuantity)}</strong>
                </Text>
              ))}
            </>
          )}
          <Link href={dashboardUrl} style={button}>{t('weeklyDigest.cta')} →</Link>
          <Hr style={hr} />
          <EmailFooter
            footerText={t('common.footer')}
            companyAddress={companyAddress}
            unsubscribeUrl={unsubscribeUrl}
            unsubscribeLabel={t('weeklyDigest.unsubscribe')}
          />
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '20px 0 48px', maxWidth: '580px' }
const h1 = { color: '#333', fontSize: '24px', fontWeight: '700', padding: '0 48px' }
const text = { color: '#333', fontSize: '16px', lineHeight: '26px', padding: '0 48px' }
const statsRow = { margin: '24px 48px' }
const statCell = { textAlign: 'center' as const, padding: '12px' }
const statValue = { color: '#0f172a', fontSize: '28px', fontWeight: '700', margin: '0' }
const statLabel = { color: '#64748b', fontSize: '13px', margin: '4px 0 0' }
const sectionLabel = { color: '#333', fontSize: '14px', fontWeight: '600', padding: '0 48px', margin: '16px 0 8px' }
const listItem = { color: '#333', fontSize: '14px', padding: '0 48px', margin: '0 0 4px' }
const button = { backgroundColor: '#0f172a', borderRadius: '6px', color: '#fff', display: 'inline-block', fontSize: '14px', fontWeight: '600', padding: '12px 24px', textDecoration: 'none', margin: '16px 48px' }
const hr = { borderColor: '#e6ebf1', margin: '20px 48px' }
