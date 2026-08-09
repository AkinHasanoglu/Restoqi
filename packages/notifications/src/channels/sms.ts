import type { AlertPayload } from '../types'

export async function sendSmsAlert(payload: AlertPayload, toPhone: string) {
  const accountSid = process.env['TWILIO_ACCOUNT_SID']
  const authToken = process.env['TWILIO_AUTH_TOKEN']
  const from = process.env['TWILIO_PHONE_NUMBER']
  if (!accountSid || !authToken || !from) throw new Error('Twilio env vars not set')

  const body = `Stock Alert: ${payload.productTitle} has ${payload.currentQuantity} units (threshold: ${payload.thresholdValue})`
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: toPhone, From: from, Body: body }).toString(),
  })
  if (!res.ok) throw new Error(`Twilio SMS failed: ${res.status}`)
}
