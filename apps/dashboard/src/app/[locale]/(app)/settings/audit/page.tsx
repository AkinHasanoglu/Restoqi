import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerSupabaseClient } from '@stockalert/database/server'
import type { AuditAction } from '@stockalert/database'
import { Badge, Button, Input } from '@stockalert/ui'

export const metadata: Metadata = { title: 'Audit Log' }

// Record<AuditAction, ...> (not Record<string, ...>) so this map must stay
// exhaustive — a future audit_action enum addition becomes a compile
// error here instead of silently falling back to the 'outline' badge.
const ACTION_VARIANTS: Record<AuditAction, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'team.created': 'default',
  'team.updated': 'secondary',
  'team.deleted': 'destructive',
  'member.invited': 'secondary',
  'member.joined': 'default',
  'member.removed': 'destructive',
  'member.role_changed': 'secondary',
  'store.connected': 'default',
  'store.disconnected': 'destructive',
  'store.updated': 'secondary',
  'store.synced': 'outline',
  'rule.created': 'default',
  'rule.updated': 'secondary',
  'rule.deleted': 'destructive',
  'rule.toggled': 'secondary',
  'channel.created': 'default',
  'channel.updated': 'secondary',
  'channel.deleted': 'destructive',
  'subscription.changed': 'secondary',
  'api_key.updated': 'secondary',
  'settings.updated': 'secondary',
  'note.created': 'default',
  'note.updated': 'secondary',
  'note.deleted': 'destructive',
  'alert.dispatched': 'outline',
}

const ALL_ACTIONS = Object.keys(ACTION_VARIANTS) as AuditAction[]
const PAGE_SIZE = 50

function formatAction(action: string): string {
  return action
    .split('.')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function isAuditAction(value: string): value is AuditAction {
  return (ALL_ACTIONS as string[]).includes(value)
}

interface AuditPageProps {
  searchParams: Promise<{ action?: string; actor?: string; page?: string }>
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const params = await searchParams
  const actionFilter = params.action && isAuditAction(params.action) ? params.action : undefined
  const actorFilter = params.actor?.trim() ?? ''
  const page = Math.max(1, Number(params.page) || 1)

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', user.id)
    .order('joined_at')
    .limit(1)
    .single()

  if (!membership || !['admin', 'owner'].includes(membership.role)) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground">Only admins and owners can view the audit log.</p>
      </div>
    )
  }

  let query = supabase
    .from('audit_logs')
    .select('id, action, actor_email, metadata, created_at', { count: 'exact' })
    .eq('team_id', membership.team_id)

  if (actionFilter) query = query.eq('action', actionFilter)
  if (actorFilter) query = query.ilike('actor_email', `%${actorFilter}%`)

  const from = (page - 1) * PAGE_SIZE
  const { data: logs, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  function pageHref(overrides: Record<string, string | undefined>) {
    const next = new URLSearchParams()
    const merged = { action: actionFilter, actor: actorFilter || undefined, page: String(page), ...overrides }
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value)
    }
    const qs = next.toString()
    return qs ? `?${qs}` : ''
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">{String(count ?? 0)} events</p>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="GET">
        <div className="space-y-1">
          <label htmlFor="action" className="text-xs font-medium text-muted-foreground">Action</label>
          <select
            id="action"
            name="action"
            defaultValue={actionFilter ?? ''}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All actions</option>
            {ALL_ACTIONS.map((action) => (
              <option key={action} value={action}>{formatAction(action)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="actor" className="text-xs font-medium text-muted-foreground">Actor email</label>
          <Input id="actor" name="actor" defaultValue={actorFilter} placeholder="name@company.com" className="h-9 w-56" />
        </div>
        <Button type="submit" variant="outline" size="sm">Filter</Button>
        {(actionFilter || actorFilter) && (
          <Link href="?" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            Clear filters
          </Link>
        )}
      </form>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Action</th>
              <th className="px-4 py-3 text-left font-medium">Actor</th>
              <th className="px-4 py-3 text-left font-medium">Details</th>
              <th className="px-4 py-3 text-left font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => (
              <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Badge variant={ACTION_VARIANTS[log.action]} className="text-xs">
                    {formatAction(log.action)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{log.actor_email ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                  {JSON.stringify(log.metadata ?? {}).slice(0, 80)}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                </td>
              </tr>
            ))}
            {!logs?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No audit events match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Link href={pageHref({ page: String(Math.max(1, page - 1)) })}>
              <Button variant="outline" size="sm" disabled={page <= 1}>Previous</Button>
            </Link>
            <Link href={pageHref({ page: String(Math.min(totalPages, page + 1)) })}>
              <Button variant="outline" size="sm" disabled={page >= totalPages}>Next</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
