import { Resend } from 'resend'
import { render } from '@react-email/render'
import { createElement } from 'react'
import {
  InviteAcceptedEmail,
  PaymentFailedEmail,
  WeeklyDigestEmail,
  PolicyUpdateEmail,
  TrialReminderEmail,
  getEmailTranslator,
  defaultLocale,
  type AtRiskProduct,
  type Locale,
} from '@stockalert/emails'

function getResend(): Resend {
  const apiKey = process.env['RESEND_API_KEY']
  if (!apiKey) throw new Error('RESEND_API_KEY not set')
  return new Resend(apiKey)
}

function getFrom(): string {
  return process.env['RESEND_FROM_EMAIL'] ?? 'alerts@getlavanchor.com'
}

function coerceLocale(locale: string): Locale {
  return (locale || defaultLocale) as Locale
}

// Undefined (rather than a broken relative path) when the landing app's
// URL isn't configured — react-email's <Img> just omits the tag then; see
// packages/emails/src/components/email-header.tsx.
function getLogoUrl(): string | undefined {
  const landingUrl = process.env['NEXT_PUBLIC_LANDING_URL']
  return landingUrl ? `${landingUrl}/brand/logo-lockup.png` : undefined
}

// CAN-SPAM's required physical postal address, rendered by
// packages/emails/src/components/email-footer.tsx on every send below.
// Undefined (footer line omitted) rather than a fake placeholder address
// when unset — see compliance audit rule 14.
function getCompanyAddress(): string | undefined {
  return process.env['NEXT_PUBLIC_COMPANY_ADDRESS'] || undefined
}

export interface SendInviteAcceptedEmailParams {
  toEmail: string
  locale: string
  memberName: string
  memberEmail: string
  teamName: string
  teamUrl: string
}

/** Notifies the inviter once an invitation is accepted (actions/team.ts's acceptInvite). */
export async function sendInviteAcceptedEmail(params: SendInviteAcceptedEmailParams): Promise<void> {
  const locale = coerceLocale(params.locale)
  const element = createElement(InviteAcceptedEmail, {
    locale,
    memberName: params.memberName,
    memberEmail: params.memberEmail,
    teamName: params.teamName,
    teamUrl: params.teamUrl,
    logoUrl: getLogoUrl(),
  })
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })])
  const t = getEmailTranslator(locale)
  const subject = t('inviteAccepted.subject', { memberName: params.memberName, teamName: params.teamName })

  await getResend().emails.send({ from: getFrom(), to: params.toEmail, subject, html, text })
}

export interface SendPaymentFailedEmailParams {
  toEmail: string
  locale: string
  teamName: string
  updatePaymentUrl: string
}

/** Dunning email for Paddle's transaction.payment_failed event (api/webhooks/paddle/route.ts). */
export async function sendPaymentFailedEmail(params: SendPaymentFailedEmailParams): Promise<void> {
  const locale = coerceLocale(params.locale)
  const element = createElement(PaymentFailedEmail, {
    locale,
    teamName: params.teamName,
    updatePaymentUrl: params.updatePaymentUrl,
    logoUrl: getLogoUrl(),
  })
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })])
  const t = getEmailTranslator(locale)
  const subject = t('paymentFailed.subject')

  await getResend().emails.send({ from: getFrom(), to: params.toEmail, subject, html, text })
}

export interface SendWeeklyDigestEmailParams {
  toEmail: string
  locale: string
  teamName: string
  trackedProductCount: number
  alertCount: number
  topAtRisk: AtRiskProduct[]
  dashboardUrl: string
  /**
   * apps/dashboard/src/lib/unsubscribe.ts's signUnsubscribeToken(teamId),
   * built into a full `${appUrl}/api/unsubscribe?token=...` URL by the
   * caller (api/worker/digest) — this package doesn't depend on the app's
   * lib code, so it takes the finished URL rather than a team id. The
   * only periodic/non-transactional send in the product; see compliance
   * audit rule 14 (CAN-SPAM one-click unsubscribe).
   */
  unsubscribeUrl: string
}

/** Weekly summary, sent by the api/worker/digest cron route. */
export async function sendWeeklyDigestEmail(params: SendWeeklyDigestEmailParams): Promise<void> {
  const locale = coerceLocale(params.locale)
  const element = createElement(WeeklyDigestEmail, {
    locale,
    teamName: params.teamName,
    trackedProductCount: params.trackedProductCount,
    alertCount: params.alertCount,
    topAtRisk: params.topAtRisk,
    dashboardUrl: params.dashboardUrl,
    logoUrl: getLogoUrl(),
    companyAddress: getCompanyAddress(),
    unsubscribeUrl: params.unsubscribeUrl,
  })
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })])
  const t = getEmailTranslator(locale)
  const subject = t('weeklyDigest.subject')

  await getResend().emails.send({
    from: getFrom(),
    to: params.toEmail,
    subject,
    html,
    text,
    headers: {
      // RFC 2369 + RFC 8058 one-click unsubscribe — mail clients (Gmail,
      // Outlook, etc.) surface their own "Unsubscribe" affordance next to
      // the sender when these are present, on top of the in-body link.
      'List-Unsubscribe': `<${params.unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })
}

export interface SendPolicyUpdateEmailParams {
  toEmail: string
  locale: string
  /** e.g. "Privacy Policy" — matched against the translated policy name shown in the email. */
  policyName: string
  /** The changed page's POLICY_VERSION, e.g. "2026-08-25". */
  effectiveDate: string
  policyUrl: string
}

/**
 * Notifies a registered user ahead of a material change to a legal
 * document (Terms, Privacy Policy, DPA) — compliance audit rule 30.
 * Intended to be triggered manually per release (there's no automated
 * diff-the-legal-pages job), by whoever ships the policy change, once per
 * affected user.
 */
export async function sendPolicyUpdateEmail(params: SendPolicyUpdateEmailParams): Promise<void> {
  const locale = coerceLocale(params.locale)
  const element = createElement(PolicyUpdateEmail, {
    locale,
    policyName: params.policyName,
    effectiveDate: params.effectiveDate,
    policyUrl: params.policyUrl,
    logoUrl: getLogoUrl(),
    companyAddress: getCompanyAddress(),
  })
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })])
  const t = getEmailTranslator(locale)
  const subject = t('policyUpdate.subject', { policyName: params.policyName })

  await getResend().emails.send({ from: getFrom(), to: params.toEmail, subject, html, text })
}

export interface SendTrialReminderEmailParams {
  toEmail: string
  locale: string
  teamName: string
  daysLeft: number
  billingUrl: string
}

/** Sent by api/worker/trial's daily cron ~3 days before a team's trial ends. */
export async function sendTrialReminderEmail(params: SendTrialReminderEmailParams): Promise<void> {
  const locale = coerceLocale(params.locale)
  const element = createElement(TrialReminderEmail, {
    locale,
    teamName: params.teamName,
    daysLeft: params.daysLeft,
    billingUrl: params.billingUrl,
    logoUrl: getLogoUrl(),
    companyAddress: getCompanyAddress(),
  })
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })])
  const t = getEmailTranslator(locale)
  const subject = t('trialReminder.subject', { daysLeft: params.daysLeft })

  await getResend().emails.send({ from: getFrom(), to: params.toEmail, subject, html, text })
}
