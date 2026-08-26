import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@stockalert/database/server'
import { sendWeeklyDigestEmail } from '@stockalert/notifications'
import { isAuthorizedWorkerRequest } from '../../../../lib/worker-auth'
import { signUnsubscribeToken } from '../../../../lib/unsubscribe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Db = ReturnType<typeof createServiceRoleClient>

async function findOwnerEmail(teamId: string, db: Db): Promise<string | null> {
  const { data: owner } = await db
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()
  if (!owner) return null

  const { data, error } = await db.auth.admin.getUserById(owner.user_id)
  if (error || !data.user?.email) return null
  return data.user.email
}

async function sendDigestForTeam(teamId: string, db: Db): Promise<void> {
  const since7 = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? ''

  const [{ data: team }, { count: trackedProductCount }, { count: alertCount }, { data: atRiskRows }, ownerEmail] =
    await Promise.all([
      db.from('teams').select('name, locale, weekly_digest_opt_out').eq('id', teamId).single(),
      db.from('products').select('id', { count: 'exact', head: true }).eq('team_id', teamId).eq('is_tracked', true),
      db.from('alerts').select('id', { count: 'exact', head: true }).eq('team_id', teamId).gte('created_at', since7),
      db
        .from('products')
        .select('title, current_quantity')
        .eq('team_id', teamId)
        .eq('is_tracked', true)
        .not('current_quantity', 'is', null)
        .order('current_quantity', { ascending: true })
        .limit(5),
      findOwnerEmail(teamId, db),
    ])

  if (!ownerEmail) return
  // Compliance audit rule 14 — a team that clicked the digest's
  // unsubscribe link stays unsubscribed until they re-enable it
  // themselves; nothing else in the product re-flips this flag.
  if (team?.weekly_digest_opt_out) return

  await sendWeeklyDigestEmail({
    toEmail: ownerEmail,
    locale: team?.locale ?? 'tr',
    teamName: team?.name ?? 'StockAlert',
    trackedProductCount: trackedProductCount ?? 0,
    alertCount: alertCount ?? 0,
    topAtRisk: (atRiskRows ?? []).map((p) => ({
      title: p.title ?? 'Untitled product',
      currentQuantity: p.current_quantity ?? 0,
    })),
    dashboardUrl: `${appUrl}/overview`,
    unsubscribeUrl: `${appUrl}/api/unsubscribe?token=${signUnsubscribeToken(teamId)}`,
  })
}

/**
 * Weekly cron (see vercel.json). Only teams with at least one tracked
 * product get a digest — an empty summary isn't useful and would just
 * train the recipient to ignore the email.
 */
export async function GET(request: NextRequest) {
  if (!(await isAuthorizedWorkerRequest(request, ''))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceRoleClient()
  const { data: teamIdRows } = await db
    .from('products')
    .select('team_id')
    .eq('is_tracked', true)

  const teamIds = [...new Set((teamIdRows ?? []).map((r) => r.team_id))]

  const results = await Promise.allSettled(
    teamIds.map(async (teamId) => {
      try {
        await sendDigestForTeam(teamId, db)
      } catch (err) {
        console.error('[digest] send failed', { teamId, err })
        throw err
      }
    })
  )

  const failed = results.filter((r) => r.status === 'rejected').length
  return NextResponse.json({ total: results.length, failed })
}
