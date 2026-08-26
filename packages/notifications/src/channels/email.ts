import { Resend } from 'resend'
import { render } from '@react-email/render'
import { createElement } from 'react'
import { LowStockAlert, getEmailTranslator, defaultLocale, type ThresholdUnit } from '@stockalert/emails'
import type { AlertPayload } from '../types'

const UNIT_KEY: Record<ThresholdUnit, string> = {
  absolute: 'lowStockAlert.unitAbsolute',
  percentage: 'lowStockAlert.unitPercentage',
  days_of_supply: 'lowStockAlert.unitDaysOfSupply',
}

export async function sendEmailAlert(payload: AlertPayload, toEmail: string) {
  const apiKey = process.env['RESEND_API_KEY']
  if (!apiKey) throw new Error('RESEND_API_KEY not set')

  const resend = new Resend(apiKey)
  const from = process.env['RESEND_FROM_EMAIL'] ?? 'alerts@getlavanchor.com'
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? ''
  // Undefined (rather than a broken relative path) when the landing app's
  // URL isn't configured — react-email's <Img> just omits the tag then;
  // see packages/emails/src/components/email-header.tsx.
  const landingUrl = process.env['NEXT_PUBLIC_LANDING_URL']
  const logoUrl = landingUrl ? `${landingUrl}/brand/logo-lockup.png` : undefined
  // teams.locale is an unconstrained `text` column at the type level (see
  // AlertPayload.locale); fall back rather than pass an unrecognized
  // locale string down into the template's own dictionary lookup twice.
  const locale = (payload.locale || defaultLocale) as Parameters<typeof getEmailTranslator>[0]

  // Plain .ts (not .tsx) — createElement rather than JSX so this package
  // doesn't need a JSX-enabled tsconfig just for this one call site.
  const element = createElement(LowStockAlert, {
    locale,
    productName: payload.productTitle,
    storeName: payload.platform,
    currentQuantity: payload.currentQuantity,
    threshold: payload.thresholdValue,
    thresholdUnit: payload.thresholdType,
    dashboardUrl: `${appUrl}/products`,
    logoUrl,
    companyAddress: process.env['NEXT_PUBLIC_COMPANY_ADDRESS'] || undefined,
  })

  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ])

  const t = getEmailTranslator(locale)
  const subject = t('lowStockAlert.subject', {
    productName: payload.productTitle,
    quantity: payload.currentQuantity,
    unit: t(UNIT_KEY[payload.thresholdType]),
  })

  await resend.emails.send({ from, to: toEmail, subject, html, text })
}
