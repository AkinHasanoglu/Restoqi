import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@stockalert/database/server'
import { logAudit } from '@stockalert/database/audit'
import { sendTrialReminderEmail } from '@stockalert/notifications'
import { isAuthorizedWorkerRequest } from '../../../../lib/worker-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const REMINDER_DAYS_BEFORE_END = 3

type Db = ReturnType<typeof createServiceRoleClient>

/**
 * Persists the trial → locked transition for a subscription whose
 * trial_ends_at has passed. resolveEffectivePlan (@stockalert/plans)
 * already locks access live at request time the instant trial_ends_at
 * passes, independent of this cron — this daily run is what makes the
 * lock durable in subscriptions.status and stops the sync worker from
 * polling the team's stores in the meantime (see the suspended_at filter
 * in worker/sync's GET handler).
 */
async function expireTrial(sub: { id: string; team_id: string }, db: Db): Promise<void> {
  await db
    .from('subscriptions')
    .update({ status: 'trial_expired', updated_at: new Date().toISOString() })
    .eq('id', sub.id)

  // Only stores not already suspended for some other billing reason —
  // idempotent against a re-run and doesn't stomp a suspension timestamp
  // set by an earlier event.
  await db
    .from('connected_stores')
    .update({ suspended_at: new Date().toISOString() })
    .eq('team_id', sub.team_id)
    .is('suspended_at', null)

  await logAudit(db, {
    teamId: sub.team_id, userId: null, actorEmail: null,
    action: 'subscription.changed', entityType: 'subscriptions', entityId: sub.id,
    metadata: { reason: 'trial_expired' },
  })
}

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

/**
 * Trial-end reminder — compliance audit rule 09 (auto-renewal/trial-end
 * notice). No "already sent" flag/column: this cron runs daily and the
 * reminder window is a single day wide, so under normal operation each
 * team crosses it exactly once. A failed cron run on that exact day would
 * skip the reminder for that team rather than retry it — an acceptable
 * trade-off for a non-critical notice, and avoids a schema migration just
 * to track delivery state that expireTrial's own idempotency (a status
 * check) doesn't need.
 */
async function sendTrialReminder(sub: { team_id: string; trial_ends_at: string | null }, db: Db): Promise<void> {
  const ownerEmail = await findOwnerEmail(sub.team_id, db)
  if (!ownerEmail) return

  const { data: team } = await db.from('teams').select('name, locale').eq('id', sub.team_id).single()
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? ''

  await sendTrialReminderEmail({
    toEmail: ownerEmail,
    locale: team?.locale ?? 'tr',
    teamName: team?.name ?? 'StockAlert',
    daysLeft: REMINDER_DAYS_BEFORE_END,
    billingUrl: `${appUrl}/settings/billing`,
  })
}

/** Daily cron (see vercel.json). */
export async function GET(request: NextRequest) {
  if (!(await isAuthorizedWorkerRequest(request, ''))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceRoleClient()
  const now = new Date()

  const { data: expiring } = await db
    .from('subscriptions')
    .select('id, team_id')
    .eq('status', 'trialing')
    .lt('trial_ends_at', now.toISOString())

  const expireResults = await Promise.allSettled(
    (expiring ?? []).map(async (sub) => {
      try {
        await expireTrial(sub, db)
      } catch (err) {
        console.error('[trial] expire failed', { teamId: sub.team_id, err })
        throw err
      }
    })
  )

  // A one-day window, REMINDER_DAYS_BEFORE_END out from now — wide enough
  // that a same-day cron run always catches every team crossing it today,
  // narrow enough that a team is only ever in the window on one run.
  const reminderWindowStart = new Date(now.getTime() + (REMINDER_DAYS_BEFORE_END - 1) * 86_400_000)
  const reminderWindowEnd = new Date(now.getTime() + REMINDER_DAYS_BEFORE_END * 86_400_000)

  const { data: endingSoon } = await db
    .from('subscriptions')
    .select('team_id, trial_ends_at')
    .eq('status', 'trialing')
    .gte('trial_ends_at', reminderWindowStart.toISOString())
    .lt('trial_ends_at', reminderWindowEnd.toISOString())

  const reminderResults = await Promise.allSettled(
    (endingSoon ?? []).map(async (sub) => {
      try {
        await sendTrialReminder(sub, db)
      } catch (err) {
        console.error('[trial] reminder failed', { teamId: sub.team_id, err })
        throw err
      }
    })
  )

  const failed = expireResults.filter((r) => r.status === 'rejected').length
  const remindersFailed = reminderResults.filter((r) => r.status === 'rejected').length
  return NextResponse.json({
    expired: expireResults.length,
    failed,
    remindersSent: reminderResults.length,
    remindersFailed,
  })
}
