import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@stockalert/database/server'
import { logAudit } from '@stockalert/database/audit'
import { verifyTwilioSignature } from '../../../../lib/twilio-signature'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STOP_WORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'])
const START_WORDS = new Set(['START', 'YES', 'UNSTOP'])

// Empty <Response/> — no auto-reply text. Twilio requires TwiML back, but
// this codebase's own STOP-language ("Reply STOP to opt out") is already
// the last message the recipient saw; nothing more needs saying.
const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
const TWIML_HEADERS = { 'Content-Type': 'text/xml' }

/**
 * Inbound SMS webhook for STOP/START replies — closes the "clear opt-out
 * support" half of compliance audit rule 21. sms.ts always appends
 * "Reply STOP to opt out" to every outbound message; this is what makes
 * that reply actually do something. Twilio's plain-number API sends
 * (TWILIO_FROM_NUMBER, not a Messaging Service with Advanced Opt-Out) do
 * not auto-honor STOP on their own, so without this webhook the
 * disclosure would be cosmetic only.
 *
 * Configure this URL as the number's "A message comes in" webhook in the
 * Twilio console. Deactivates/reactivates every sms notification_channels
 * row whose config->>'to' matches the sender — a phone number, not an
 * account, is what actually receives the text, so opt-out is scoped to
 * the number regardless of which team's channel it's attached to.
 */
export async function POST(request: NextRequest) {
  const authToken = process.env['TWILIO_AUTH_TOKEN']
  if (!authToken) {
    // Not configured — nothing to verify against, and no SMS channel can
    // be active without it either (sms.ts throws without it). Reject
    // rather than silently accepting an unverifiable request.
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  const rawBody = await request.text()
  const params = Object.fromEntries(new URLSearchParams(rawBody))
  const signature = request.headers.get('x-twilio-signature') ?? ''

  if (!verifyTwilioSignature(request.url, params, signature, authToken)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const from = params['From']
  const body = (params['Body'] ?? '').trim().toUpperCase()
  if (!from) return new NextResponse(EMPTY_TWIML, { headers: TWIML_HEADERS })

  const isStop = STOP_WORDS.has(body)
  const isStart = START_WORDS.has(body)
  if (!isStop && !isStart) return new NextResponse(EMPTY_TWIML, { headers: TWIML_HEADERS })

  const db = createServiceRoleClient()
  const { data: channels } = await db
    .from('notification_channels')
    .select('id, team_id')
    .eq('channel_type', 'sms')
    .eq('config->>to', from)

  await Promise.allSettled(
    (channels ?? []).map(async (channel) => {
      await db.from('notification_channels').update({ is_active: !isStop }).eq('id', channel.id)
      await logAudit(db, {
        teamId: channel.team_id, userId: null, actorEmail: null,
        action: 'channel.updated', entityType: 'notification_channels', entityId: channel.id,
        metadata: { reason: isStop ? 'sms_stop_reply' : 'sms_start_reply', phone: from },
      })
    })
  )

  return new NextResponse(EMPTY_TWIML, { headers: TWIML_HEADERS })
}
