import type { AlertPayload } from '../types'

// E.164: a leading '+', a non-zero first digit, up to 15 digits total.
const E164_RE = /^\+[1-9]\d{1,14}$/

/**
 * Toll-fraud / SMS-pumping guard: without this, `to` was sent to Twilio
 * completely unvalidated (any string, any country) — see 2nd security
 * audit item 6. Defaults to Turkey (this product's primary market); set
 * SMS_ALLOWED_COUNTRY_CODES to a comma-separated list of E.164 calling
 * codes (e.g. "90,1,44") to allow more.
 */
export function isAllowedSmsDestination(toPhone: string): boolean {
  if (!E164_RE.test(toPhone)) return false
  const allowed = (process.env['SMS_ALLOWED_COUNTRY_CODES'] ?? '90')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
  const digits = toPhone.slice(1)
  return allowed.some((code) => digits.startsWith(code))
}

export async function sendSmsAlert(payload: AlertPayload, toPhone: string) {
  if (!isAllowedSmsDestination(toPhone)) {
    throw new Error('SMS destination is not E.164-valid or not in an allowed country')
  }

  const accountSid = process.env['TWILIO_ACCOUNT_SID']
  const authToken = process.env['TWILIO_AUTH_TOKEN']
  // Was 'TWILIO_PHONE_NUMBER' — didn't match the validated env var name
  // (env/index.ts, .env.example both use TWILIO_FROM_NUMBER), so `from`
  // was always undefined and every SMS send threw. Unrelated to the 2nd
  // security audit, found while fixing item 6 in this same file.
  const from = process.env['TWILIO_FROM_NUMBER']
  if (!accountSid || !authToken || !from) throw new Error('Twilio env vars not set')

  // "Reply STOP to opt out" on every message — carrier/TCPA requirement
  // (compliance audit rule 21). api/webhooks/twilio-sms handles the
  // inbound STOP/START reply by deactivating/reactivating the matching
  // notification_channels row.
  const body = `Stock Alert: ${payload.productTitle} has ${payload.currentQuantity} units (threshold: ${payload.thresholdValue}). Reply STOP to opt out.`
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
