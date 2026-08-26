import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyTwilioSignature } from './twilio-signature'

const AUTH_TOKEN = 'test-twilio-auth-token'
const URL = 'https://app.example.com/api/webhooks/twilio-sms'

function sign(url: string, params: Record<string, string>, authToken = AUTH_TOKEN): string {
  let data = url
  for (const key of Object.keys(params).sort()) data += key + params[key]
  return createHmac('sha1', authToken).update(data, 'utf8').digest('base64')
}

describe('verifyTwilioSignature', () => {
  it('accepts a correctly signed request', () => {
    const params = { From: '+905551112233', Body: 'STOP' }
    expect(verifyTwilioSignature(URL, params, sign(URL, params), AUTH_TOKEN)).toBe(true)
  })

  it('rejects a tampered param', () => {
    const params = { From: '+905551112233', Body: 'STOP' }
    const signature = sign(URL, params)
    expect(verifyTwilioSignature(URL, { ...params, Body: 'START' }, signature, AUTH_TOKEN)).toBe(false)
  })

  it('rejects a signature computed with the wrong auth token', () => {
    const params = { From: '+905551112233', Body: 'STOP' }
    expect(verifyTwilioSignature(URL, params, sign(URL, params, 'wrong-token'), AUTH_TOKEN)).toBe(false)
  })

  it('rejects a signature computed for a different URL', () => {
    const params = { From: '+905551112233', Body: 'STOP' }
    const signature = sign(URL, params)
    expect(verifyTwilioSignature(`${URL}-mismatch`, params, signature, AUTH_TOKEN)).toBe(false)
  })
})
