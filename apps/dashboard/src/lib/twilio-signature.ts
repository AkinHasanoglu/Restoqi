import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verifies Twilio's `X-Twilio-Signature` header per their documented
 * algorithm: HMAC-SHA1(authToken, url + sorted "key+value" concatenation
 * of every POST param), base64-encoded. Used by
 * api/webhooks/twilio-sms to authenticate inbound STOP/START replies
 * before touching any notification_channels row (compliance audit rule 21).
 *
 * `url` must be the exact URL Twilio was configured to POST to (protocol +
 * host + path, no query string reordering) — a mismatch here (e.g. a
 * reverse proxy rewriting the scheme) produces a false negative, not a
 * false positive, so this fails closed by design.
 */
export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string,
): boolean {
  let data = url
  for (const key of Object.keys(params).sort()) {
    data += key + params[key]
  }
  const expected = createHmac('sha1', authToken).update(data, 'utf8').digest('base64')

  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}
