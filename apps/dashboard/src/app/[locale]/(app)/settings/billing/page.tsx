import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@stockalert/database/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button } from '@stockalert/ui'
import { PLAN_CONFIGS, type PlanName } from '@stockalert/plans'
import { ExternalLink } from 'lucide-react'
import { CheckoutPanel, type CheckoutPlanOption } from '../../../../../components/billing/checkout-panel'
import { getPlanContext } from '../../../../../lib/plan-limits'

export const metadata: Metadata = { title: 'Billing' }

// Env var names must match lib/paddle.ts's PLAN_PRICE_ENV_VARS exactly —
// both read from the same NEXT_PUBLIC_PADDLE_PRICE_ID_* variables the
// Paddle webhook maps back to a plan.
const CHECKOUT_PLANS = (Object.keys(PLAN_CONFIGS) as PlanName[]).map((plan) => ({
  plan,
  config: PLAN_CONFIGS[plan],
  envVar: `NEXT_PUBLIC_PADDLE_PRICE_ID_${plan.toUpperCase()}_MONTHLY`,
}))

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

  const [{ data: portalRow }, planCtx] = await Promise.all([
    teamId
      ? supabase.from('subscriptions').select('customer_portal_url').eq('team_id', teamId).maybeSingle()
      : Promise.resolve({ data: null }),
    teamId ? getPlanContext(supabase, teamId) : Promise.resolve(null),
  ])

  // effectivePlan (not the stored plan) drives what's displayed — during
  // an active trial that's Growth regardless of what the row eventually
  // falls back to, matching PLAN_CONFIGS/resolveEffectivePlan in
  // @stockalert/plans (the same source the trial banner and dashboard
  // lock read from).
  const effectivePlan = planCtx?.effectivePlan ?? 'starter'
  const status = planCtx?.status ?? 'trial_expired'
  const isTrialActive = planCtx?.isTrialActive ?? false
  const trialDaysLeft = planCtx?.trialDaysLeft ?? null
  const limits = planCtx?.limits ?? PLAN_CONFIGS.starter.limits
  const usage = planCtx?.usage ?? { store_count: 0, product_count: 0, rule_count: 0, alerts_this_month: 0, members_count: 0 }
  const planDisplay = PLAN_CONFIGS[effectivePlan]
  const supportEmail = process.env['NEXT_PUBLIC_SUPPORT_EMAIL']

  const checkoutPlans: CheckoutPlanOption[] = CHECKOUT_PLANS.flatMap(({ plan: checkoutPlan, config, envVar }) => {
    const priceId = process.env[envVar]
    if (!priceId) return []
    return [{
      plan: checkoutPlan,
      priceId,
      label: `Subscribe to ${config.displayName} — $${config.monthlyPriceUSD}/mo`,
      variant: checkoutPlan === 'growth' ? 'default' : 'outline',
    }]
  })

  const badgeVariant = status === 'active' ? 'default'
    : status === 'trialing' || status === 'past_due' ? 'secondary'
      : 'destructive'

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
                <CardTitle>{planDisplay.displayName} Plan</CardTitle>
                <CardDescription>${planDisplay.monthlyPriceUSD}/mo</CardDescription>
              </div>
              <Badge variant={badgeVariant}>
                {isTrialActive ? `Trial — ${String(trialDaysLeft)} days left` : status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {portalRow?.customer_portal_url ? (
              <a href={portalRow.customer_portal_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full gap-2">
                  Manage subscription <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            ) : status === 'active' && supportEmail ? (
              // A paid subscription with no portal URL on file means the
              // customer otherwise has no in-app way to cancel — falling
              // back to a direct support contact keeps cancellation
              // possible in as few steps as signing up required, rather
              // than silently disappearing (compliance audit rule 08).
              <a href={`mailto:${supportEmail}?subject=Manage my StockAlert subscription`}>
                <Button variant="outline" className="w-full gap-2">
                  Manage subscription (contact support) <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            ) : null}
            {status !== 'active' && teamId && (
              checkoutPlans.length > 0 ? (
                <CheckoutPanel teamId={teamId} plans={checkoutPlans} />
              ) : (
                <a href={process.env['NEXT_PUBLIC_PRICING_URL'] ?? '#'} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full gap-2">
                    View pricing <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              )
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
              {usageBar(usage.store_count, limits.stores)}
              {limits.stores < 0 && <p className="text-xs text-muted-foreground mt-1">{String(usage.store_count)} connected (unlimited)</p>}
            </div>
            <div>
              <p className="text-sm font-medium">Products tracked</p>
              {usageBar(usage.product_count, limits.products)}
              {limits.products < 0 && <p className="text-xs text-muted-foreground mt-1">{String(usage.product_count)} (unlimited)</p>}
            </div>
            <div>
              <p className="text-sm font-medium">Alerts sent</p>
              {usageBar(usage.alerts_this_month, limits.alertsPerMonth)}
              {limits.alertsPerMonth < 0 && <p className="text-xs text-muted-foreground mt-1">{String(usage.alerts_this_month)} (unlimited)</p>}
            </div>
            <div>
              <p className="text-sm font-medium">Alert rules</p>
              {usageBar(usage.rule_count, limits.rules)}
              {limits.rules < 0 && <p className="text-xs text-muted-foreground mt-1">{String(usage.rule_count)} (unlimited)</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
