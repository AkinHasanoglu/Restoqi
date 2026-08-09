import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@stockalert/database/server'
import { Badge } from '@stockalert/ui'

export const metadata: Metadata = { title: 'Audit Log' }

const ACTION_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  store_connected: 'default',
  store_disconnected: 'destructive',
  rule_created: 'default',
  rule_deleted: 'destructive',
  member_invited: 'secondary',
  member_removed: 'destructive',
  role_changed: 'secondary',
}

export default async function AuditPage() {
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

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('id, action, actor_email, metadata, created_at')
    .eq('team_id', membership.team_id)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <p className="text-sm text-muted-foreground">{String(logs?.length ?? 0)} events</p>

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
                  <Badge variant={ACTION_VARIANTS[log.action] ?? 'outline'} className="text-xs">
                    {log.action.replace(/_/g, ' ')}
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
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
