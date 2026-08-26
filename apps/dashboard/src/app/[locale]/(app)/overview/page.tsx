import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@stockalert/database/server'
import { Card, CardContent, CardHeader, CardTitle } from '@stockalert/ui'
import { Store, Package, SlidersHorizontal, Bell, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'
import { StatCard } from '../../../../components/overview/stat-card'
import { StockChart } from '../../../../components/overview/stock-chart-lazy'
import { AnimatedGrid, AnimatedGridItem } from '../../../../components/overview/animated-grid'

export const metadata: Metadata = { title: 'Genel Bakış' }

// Daily-aggregated stock trend from real inventory_snapshots (last 30 days),
// scoped by team via inventory_snapshots_team_idx (team_id, recorded_at desc).
async function StockTrend({ teamId }: { teamId: string }) {
  const supabase = await createServerSupabaseClient()
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const { data: snapshots } = await supabase
    .from('inventory_snapshots')
    .select('product_id, quantity, recorded_at')
    .eq('team_id', teamId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true })

  if (!snapshots?.length) {
    return <StockChart data={[]} />
  }

  // Keep only the latest snapshot per (product_id, day) so a product polled
  // multiple times a day isn't double-counted in the daily total.
  const latestByProductDay = new Map<string, number>()
  for (const s of snapshots) {
    const day = s.recorded_at.slice(0, 10) // YYYY-MM-DD
    latestByProductDay.set(`${s.product_id}:${day}`, s.quantity)
  }

  const totalsByDay = new Map<string, number>()
  for (const [key, quantity] of latestByProductDay) {
    const day = key.slice(key.indexOf(':') + 1)
    totalsByDay.set(day, (totalsByDay.get(day) ?? 0) + quantity)
  }

  const chartData = [...totalsByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, quantity]) => ({
      date: new Date(day).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
      quantity,
    }))

  return <StockChart data={chartData} title="Stok Trendi — Son 30 Gün" />
}

async function OverviewStats({ teamId }: { teamId: string }) {
  const supabase = await createServerSupabaseClient()

  const [storesResult, productsResult, rulesResult, alertsResult] = await Promise.all([
    supabase.from('connected_stores').select('id', { count: 'exact', head: true }).eq('team_id', teamId).eq('is_active', true),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('team_id', teamId),
    supabase.from('alert_rules').select('id', { count: 'exact', head: true }).eq('team_id', teamId).eq('is_active', true),
    supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('team_id', teamId).gte('created_at', new Date(Date.now() - 86_400_000).toISOString()),
  ])

  const stats = [
    {
      label: 'Bağlı Mağazalar',
      value: storesResult.count ?? 0,
      icon: <Store className="h-5 w-5" style={{ color: '#3b82f6' }} />,
      iconBg: '#3b82f614',
    },
    {
      label: 'Takip Edilen Ürünler',
      value: productsResult.count ?? 0,
      icon: <Package className="h-5 w-5" style={{ color: '#f97316' }} />,
      iconBg: '#f9731614',
    },
    {
      label: 'Aktif Kurallar',
      value: rulesResult.count ?? 0,
      icon: <SlidersHorizontal className="h-5 w-5" style={{ color: '#10b981' }} />,
      iconBg: '#10b98114',
    },
    {
      label: 'Bugünkü Uyarılar',
      value: alertsResult.count ?? 0,
      icon: <Bell className="h-5 w-5" style={{ color: '#f59e0b' }} />,
      iconBg: '#f59e0b14',
    },
  ]

  return (
    <AnimatedGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <AnimatedGridItem key={s.label}>
          <StatCard {...s} />
        </AnimatedGridItem>
      ))}
    </AnimatedGrid>
  )
}

async function CriticalProducts({ teamId }: { teamId: string }) {
  const supabase = await createServerSupabaseClient()
  const { data: products } = await supabase
    .from('products')
    .select('id, title, platform, current_quantity')
    .eq('team_id', teamId)
    .not('current_quantity', 'is', null)
    .order('current_quantity', { ascending: true })
    .limit(5)

  if (!products?.length) {
    return <p className="text-sm text-muted-foreground">Henüz takip edilen ürün yok.</p>
  }

  return (
    <ul className="space-y-3">
      {products.map((p) => {
        const qty = p.current_quantity ?? 0
        const isCritical = qty <= 2
        const isLow = qty <= 10
        const barColor = isCritical ? 'bg-destructive' : isLow ? 'bg-warning' : 'bg-green-500'
        const pct = Math.min(100, (qty / 100) * 100)

        return (
          <li key={p.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium leading-none">{p.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{p.platform}</p>
              </div>
              <span className={`text-sm font-bold tabular-nums ${isCritical ? 'text-destructive' : isLow ? 'text-warning' : 'text-green-600'}`}>
                {qty} adet
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className={`h-1.5 rounded-full transition-all ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

async function RecentAlerts({ teamId }: { teamId: string }) {
  const supabase = await createServerSupabaseClient()
  const { data: alerts } = await supabase
    .from('alerts')
    .select('id, status, created_at, products(title), alert_rules(name)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (!alerts?.length) {
    return <p className="text-sm text-muted-foreground">Son uyarı yok.</p>
  }

  const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
    delivered: { icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-500' },
    pending: { icon: <Clock className="h-4 w-4" />, color: 'text-amber-500' },
    failed: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-destructive' },
    suppressed: { icon: <Clock className="h-4 w-4" />, color: 'text-muted-foreground' },
  }

  return (
    <ul className="space-y-3">
      {alerts.map((alert) => {
        const product = alert.products as { title: string } | null
        const rule = alert.alert_rules as { name: string } | null
        const config = STATUS_CONFIG[alert.status] ?? STATUS_CONFIG['pending']

        return (
          <li key={alert.id} className="flex items-start gap-3">
            <div className={`mt-0.5 shrink-0 ${config?.color}`}>
              {config?.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-none truncate">{product?.title ?? '—'}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{rule?.name ?? ''}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {new Date(alert.created_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default async function OverviewPage() {
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

  if (!membership) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Genel Bakış</h1>
        <p className="text-muted-foreground">
          Takım bulunamadı.{' '}
          <Link href="settings/team" className="text-primary underline-offset-4 hover:underline">
            Takımınızı oluşturun →
          </Link>
        </p>
      </div>
    )
  }

  const teamId = membership.team_id

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Genel Bakış</h1>
        <p className="text-sm text-muted-foreground">Envanterinize genel bakış</p>
      </div>

      <OverviewStats teamId={teamId} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stock chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stok Trendi</CardTitle>
          </CardHeader>
          <CardContent>
            <StockTrend teamId={teamId} />
          </CardContent>
        </Card>

        {/* Critical products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En Düşük Stok</CardTitle>
            <Link href="products" className="text-xs text-primary hover:underline underline-offset-4">
              Tümünü gör →
            </Link>
          </CardHeader>
          <CardContent>
            <CriticalProducts teamId={teamId} />
          </CardContent>
        </Card>

        {/* Recent alerts */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Son Uyarılar</CardTitle>
            <Link href="alerts" className="text-xs text-primary hover:underline underline-offset-4">
              Tümünü gör →
            </Link>
          </CardHeader>
          <CardContent>
            <RecentAlerts teamId={teamId} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
