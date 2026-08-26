import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'
import { getEmailTranslator, defaultLocale, type Locale } from '../i18n'
import { EmailHeader } from '../components/email-header'
import { EmailFooter } from '../components/email-footer'

export type ThresholdUnit = 'absolute' | 'percentage' | 'days_of_supply'

interface LowStockAlertProps {
  locale?: Locale
  productName: string
  storeName: string
  currentQuantity: number
  threshold: number
  thresholdUnit?: ThresholdUnit
  productUrl?: string
  dashboardUrl: string
  logoUrl?: string
  companyAddress?: string
}

const UNIT_KEY: Record<ThresholdUnit, string> = {
  absolute: 'lowStockAlert.unitAbsolute',
  percentage: 'lowStockAlert.unitPercentage',
  days_of_supply: 'lowStockAlert.unitDaysOfSupply',
}

export function LowStockAlert({
  locale = defaultLocale,
  productName = 'Product Name',
  storeName = 'My Store',
  currentQuantity = 5,
  threshold = 10,
  thresholdUnit = 'absolute',
  productUrl,
  dashboardUrl = 'https://app.example.com',
  logoUrl,
  companyAddress,
}: LowStockAlertProps) {
  const t = getEmailTranslator(locale)
  const unit = t(UNIT_KEY[thresholdUnit])

  return (
    <Html>
      <Head />
      <Preview>{t('lowStockAlert.preview', { productName, quantity: currentQuantity })}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader logoUrl={logoUrl} />
          <Heading style={h1}>{t('lowStockAlert.heading')}</Heading>
          <Text style={text}>{t('lowStockAlert.body', { productName, storeName })}</Text>
          <Section style={alertBox}>
            <Text style={alertText}>
              {t('lowStockAlert.currentQuantity')}: <strong>{String(currentQuantity)}</strong>
            </Text>
            <Text style={alertText}>
              {t('lowStockAlert.threshold')}: <strong>{String(threshold)} {unit}</strong>
            </Text>
          </Section>
          {productUrl && (
            <Text style={text}>
              <Link href={productUrl}>{t('lowStockAlert.viewProduct')}</Link>
            </Text>
          )}
          <Hr style={hr} />
          <Text style={footer}>
            <Link href={dashboardUrl}>{t('lowStockAlert.manageAlerts')}</Link>
          </Text>
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
const alertBox = { backgroundColor: '#fff3cd', borderRadius: '8px', margin: '24px 48px', padding: '16px' }
const alertText = { color: '#856404', fontSize: '14px', margin: '0' }
const hr = { borderColor: '#e6ebf1', margin: '20px 48px' }
const footer = { color: '#8898aa', fontSize: '12px', padding: '0 48px' }
