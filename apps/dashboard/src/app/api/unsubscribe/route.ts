import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@stockalert/database/server'
import { verifyUnsubscribeToken } from '../../../lib/unsubscribe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * No-login unsubscribe for the weekly digest email — compliance audit
 * rule 14 (CAN-SPAM's functional, no-login unsubscribe requirement).
 * Only ever touches teams.weekly_digest_opt_out; it can't affect
 * low-stock alerts or any transactional email, since those aren't gated
 * by this flag (see api/worker/digest's use of it).
 *
 * GET handles a normal click from the email body/footer link. POST
 * handles RFC 8058 one-click unsubscribe (the `List-Unsubscribe-Post:
 * List-Unsubscribe=One-Click` header set on the digest send — mail
 * clients that support it POST here directly with no page load or
 * confirmation click at all).
 */
async function unsubscribe(token: string | null): Promise<NextResponse> {
  const teamId = token ? verifyUnsubscribeToken(token) : null
  if (!teamId) {
    return new NextResponse('This unsubscribe link is invalid or has expired.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const db = createServiceRoleClient()
  const { error } = await db.from('teams').update({ weekly_digest_opt_out: true }).eq('id', teamId)
  if (error) {
    console.error('[unsubscribe] failed to set weekly_digest_opt_out', { teamId, error })
    return new NextResponse('Something went wrong — please try again.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  return new NextResponse('You have been unsubscribed from the StockAlert weekly digest email.', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

export async function GET(request: NextRequest) {
  return unsubscribe(request.nextUrl.searchParams.get('token'))
}

export async function POST(request: NextRequest) {
  return unsubscribe(request.nextUrl.searchParams.get('token'))
}
