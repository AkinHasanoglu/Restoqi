import { Resend } from 'resend'
import type { AlertPayload } from '../types'

export async function sendEmailAlert(payload: AlertPayload, toEmail: string) {
  const apiKey = process.env['RESEND_API_KEY']
  if (!apiKey) throw new Error('RESEND_API_KEY not set')

  const resend = new Resend(apiKey)
  const from = process.env['RESEND_FROM_EMAIL'] ?? 'alerts@getlavanchor.com'

  await resend.emails.send({
    from,
    to: toEmail,
    subject: `⚠️ Low Stock Alert: ${payload.productTitle}`,
    html: `
      <h2>Low Stock Alert</h2>
      <p><strong>${payload.productTitle}</strong> on ${payload.platform} has <strong>${payload.currentQuantity} units</strong> remaining.</p>
      <p>This is below your threshold of ${payload.thresholdValue} ${payload.thresholdType === 'absolute' ? 'units' : payload.thresholdType === 'days_of_supply' ? 'days of supply' : '%'}.</p>
      <p><a href="${process.env['NEXT_PUBLIC_APP_URL'] ?? ''}/products">View products →</a></p>
    `,
  })
}
