import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@stockalert/database/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button } from '@stockalert/ui'
import { ExternalLink } from 'lucide-react'

export const metadata: Metadata = { title: 'Billing' }

const PLAN_LIMITS = {
  starter: { stores: 1, products: 500, alertsPerMonth: 100, rules: 5 },
  business: { stores: 5, products: 5000, alertsPerMonth: 1000, rules: 25 },
  enterprise: { stores: -1, products: -1, alertsPerMonth: -1, rules: -1 },
}

const PLAN_PRICES = {
  starter: '$29/mo',
  business: '$89/mo',
  enterprise: 'Custom',
}

export default async function BillingPage() {
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

  const [subscriptionResult, usageResult] = await Promise.all([
    teamId
      ? supabase.from('subscriptions').select('*').eq('team_id', teamId).single()
      : Promise.resolve({ data: null }),
    teamId
      ? Promise.all([
          supabase.from('connected_stores').select('id', { count: 'exact', head: true }).eq('team_id', teamId).eq('status', 'active'),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('team_id', teamId),
          supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('team_id', teamId).gte('triggered_at', new Date(Date.now() - 30 * 86_400_000).toISOString()),
          supabase.from('alert_rules').select('id', { count: 'exact', head: true }).eq('team_id', teamId),
        ])
      : Promise.resolve([{ count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }]),
  ])

  const subscription = subscriptionResult.data as {
    plan: 'starter' | 'business' | 'enterprise'
    status: string
    current_period_end: string
    customer_portal_url: string | null
    trial_ends_at: string | null
  } | null

  const [storeUsage, productUsage, alertUsage, ruleUsage] = Array.isArray(usageResult)
    ? usageResult.map((r) => (r as { count: number | null }).count ?? 0)
    : [0, 0, 0, 0]

  const plan = subscription?.plan ?? 'starter'
  const limits = PLAN_LIMITS[plan]

  const isTrial = subscription?.status === 'trialing'
  const trialEndsAt = subscription?.trial_ends_at
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : null

  function usageBar(used: number, limit: number) {
    if (limit < 0) return null
    const pct = Math.min(100, (used / limit) * 100)
    return (
      <div className="mt-1.5">
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {String(used)} / {String(limit)} used
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your plan and usage</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="capitalize">{plan} Plan</CardTitle>
                <CardDescription>{PLAN_PRICES[plan]}</CardDescription>
              </div>
              <Badge variant={
                subscription?.status === 'active' ? 'default'
                  : subscription?.status === 'trialing' ? 'secondary'
                    : 'destructive'
              }>
                {isTrial ? `Trial — ${String(trialDaysLeft)} days left` : (subscription?.status ?? 'No subscription')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription?.customer_portal_url && (
              <a href={subscription.customer_portal_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full gap-2">
                  Manage subscription <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            )}
            {!subscription && (
              <a
                href={`${process.env['NEXT_PUBLIC_LEMONSQUEEZY_STORE_URL'] ?? '#'}/checkout`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full">Upgrade plan</Button>
              </a>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage this month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Stores</p>
              {usageBar(storeUsage, limits.stores)}
              {limits.stores < 0 && <p className="text-xs text-muted-foreground mt-1">{String(storeUsage)} connected (unlimited)</p>}
            </div>
            <div>
              <p className="text-sm font-medium">Products tracked</p>
              {usageBar(productUsage, limits.products)}
              {limits.products < 0 && <p className="text-xs text-muted-foreground mt-1">{String(productUsage)} (unlimited)</p>}
            </div>
            <div>
              <p className="text-sm font-medium">Alerts sent</p>
              {usageBar(alertUsage, limits.alertsPerMonth)}
              {limits.alertsPerMonth < 0 && <p className="text-xs text-muted-foreground mt-1">{String(alertUsage)} (unlimited)</p>}
            </div>
            <div>
              <p className="text-sm font-medium">Alert rules</p>
              {usageBar(ruleUsage, limits.rules)}
              {limits.rules < 0 && <p className="text-xs text-muted-foreground mt-1">{String(ruleUsage)} (unlimited)</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
