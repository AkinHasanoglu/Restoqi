import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@stockalert/database/server'
import { Badge, EmptyState } from '@stockalert/ui'
import { Bell } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Alerts' }

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  delivered: 'default',
  pending: 'secondary',
  failed: 'destructive',
  suppressed: 'outline',
}

export default async function AlertsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .order('joined_at')
    .limit(1)
    .single()

  const teamId = membership?.team_id

  const { data: alerts } = teamId
    ? await supabase
        .from('alerts')
        .select('id, status, current_quantity, threshold_value, triggered_at, rule_id, product_id, alert_rules(name), products(title, platform)')
        .eq('team_id', teamId)
        .order('triggered_at', { ascending: false })
        .limit(100)
    : { data: [] }

  if (!alerts?.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Alerts</h1>
        <EmptyState
          icon={<Bell className="h-10 w-10 text-muted-foreground" />}
          title="No alerts yet"
          description="Alerts will appear here when stock drops below your rule thresholds."
          action={
            <Link href="alerts/rules">
              <Badge variant="outline" className="cursor-pointer hover:bg-accent">Set up alert rules →</Badge>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Alerts</h1>
        <Link href="alerts/rules">
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">Manage rules →</Badge>
        </Link>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Product</th>
              <th className="px-4 py-3 text-left font-medium">Rule</th>
              <th className="px-4 py-3 text-left font-medium">Stock</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Triggered</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => {
              const product = alert.products as { title: string; platform: string } | null
              const rule = alert.alert_rules as { name: string } | null
              return (
                <tr key={alert.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{product?.title ?? '—'}</div>
                    <div className="text-xs text-muted-foreground capitalize">{product?.platform ?? ''}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{rule?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono">{String(alert.current_quantity)}</span>
                    <span className="text-muted-foreground"> / {String(alert.threshold_value)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANTS[alert.status] ?? 'secondary'}>
                      {alert.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(alert.triggered_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
