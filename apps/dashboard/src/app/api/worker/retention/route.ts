import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@stockalert/database/server'
import { reportToHub } from '../../../../lib/hub-reporter'
import { isAuthorizedWorkerRequest } from '../../../../lib/worker-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const INACTIVITY_THRESHOLD_MONTHS = 24

/**
 * Reports (never deletes) teams with no audit-log activity in the last
 * INACTIVITY_THRESHOLD_MONTHS, created before that window too — a
 * human-in-the-loop signal for account cleanup, not an automated purge.
 * Compliance audit rule 35 deliberately stops short of auto-deleting a
 * customer's account/data on an inactivity timer; that's the same
 * self-service Danger Zone action already covered by rule 11
 * (apps/dashboard/src/actions/account.ts), just never triggered by us
 * unilaterally.
 */
async function reportInactiveTeams(db: ReturnType<typeof createServiceRoleClient>): Promise<number> {
  const cutoff = new Date(Date.now() - INACTIVITY_THRESHOLD_MONTHS * 30 * 86_400_000).toISOString()

  const { data: recentlyActiveTeamIds } = await db
    .from('audit_logs')
    .select('team_id')
    .gte('created_at', cutoff)

  const activeSet = new Set((recentlyActiveTeamIds ?? []).map((r) => r.team_id))

  const { data: oldTeams } = await db
    .from('teams')
    .select('id, name, created_at')
    .lt('created_at', cutoff)

  const inactive = (oldTeams ?? []).filter((team) => !activeSet.has(team.id))
  if (inactive.length === 0) return 0

  await reportToHub({
    message: `${String(inactive.length)} team(s) with no activity in ${String(INACTIVITY_THRESHOLD_MONTHS)}+ months`,
    severity: 'low',
    context: { teamIds: inactive.map((t) => t.id), thresholdMonths: INACTIVITY_THRESHOLD_MONTHS },
  })

  return inactive.length
}

/** Weekly cron (see vercel.json) — purges data past its retention window and reports (not deletes) stale accounts. */
export async function GET(request: NextRequest) {
  if (!(await isAuthorizedWorkerRequest(request, ''))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceRoleClient()

  const { data: purged, error } = await db.rpc('purge_expired_data')
  if (error) {
    console.error('[retention] purge_expired_data failed', error)
    return NextResponse.json({ error: 'Purge failed' }, { status: 500 })
  }

  let inactiveTeamsReported = 0
  try {
    inactiveTeamsReported = await reportInactiveTeams(db)
  } catch (err) {
    console.error('[retention] inactive-team report failed', err)
  }

  return NextResponse.json({ purged, inactiveTeamsReported })
}
