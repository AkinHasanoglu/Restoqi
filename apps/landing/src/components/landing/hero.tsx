import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { ArrowRight, Zap, Bell, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button, Badge } from '@stockalert/ui'
import { type Locale } from '@stockalert/i18n'
import { env } from '../../env'

const CHART_BARS = [55, 72, 48, 88, 65, 94, 71, 83, 57, 76, 91, 62, 85, 73, 96]

const MOCK_ALERTS = [
  { name: 'Nike Air Max 90', store: 'Shopify', qty: 3, critical: true },
  { name: 'Samsung Galaxy S24', store: 'Trendyol', qty: 7, critical: true },
  { name: "Levi's 501 Original", store: 'Amazon', qty: 14, critical: false },
]

const MOCK_STATS = [
  { value: '12,847', label: 'Products', accent: '#3b82f6' },
  { value: '23', label: 'Low Stock', accent: '#f59e0b' },
  { value: '7', label: 'Stores', accent: '#8b5cf6' },
  { value: '99.9%', label: 'Uptime', accent: '#10b981' },
]

const NAV_ITEMS = ['Overview', 'Products', 'Alerts', 'Rules', 'Integrations']

export function Hero() {
  const t = useTranslations('landing.hero')
  const locale = useLocale() as Locale
  const dashboardUrl = env.NEXT_PUBLIC_APP_URL

  return (
    <section className="relative overflow-hidden pb-24 pt-28">
      {/* Grid background */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_30%,transparent_100%)]" />
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-orange-500/8 blur-[120px]" />
        <div className="absolute top-60 -left-20 h-72 w-72 rounded-full bg-amber-500/6 blur-3xl" />
        <div className="absolute top-40 -right-20 h-72 w-72 rounded-full bg-orange-500/6 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Text block */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-7 flex justify-center">
            <Badge
              variant="outline"
              className="gap-1.5 rounded-full border-primary/25 bg-primary/8 px-4 py-1.5 text-sm font-medium text-orange-600 dark:text-orange-400"
            >
              <Zap className="h-3.5 w-3.5" />
              {t('badge')}
            </Badge>
          </div>

          <h1 className="text-5xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl xl:text-[80px]">
            {t('title')}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {t('subtitle')}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-12 gap-2 rounded-xl px-8 text-[15px] font-semibold shadow-lg shadow-primary/15 transition-all hover:shadow-xl hover:shadow-primary/20"
              asChild
            >
              <a href={`${dashboardUrl}/signup`}>
                {t('cta')}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 rounded-xl border-border/60 px-8 text-[15px] backdrop-blur-sm"
              asChild
            >
              <Link href={`/${locale}#how-it-works`}>{t('ctaSecondary')}</Link>
            </Button>
          </div>

          <p className="mt-5 text-sm text-muted-foreground/70">
            {t('trustedBy', { count: '2,400' })}
          </p>
        </div>

        {/* Dashboard mockup */}
        <div className="relative mt-16">
          {/* Glow behind the card */}
          <div
            className="pointer-events-none absolute inset-x-16 -top-6 -bottom-6 rounded-3xl opacity-40"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary)/0.12), transparent 70%)' }}
            aria-hidden
          />

          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl ring-1 ring-black/5">
            {/* Browser bar */}
            <div className="flex h-10 items-center justify-between border-b border-border/50 bg-muted/40 px-4">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400/70" />
                <div className="h-3 w-3 rounded-full bg-amber-400/70" />
                <div className="h-3 w-3 rounded-full bg-emerald-400/70" />
              </div>
              <div className="flex h-6 items-center justify-center rounded-md bg-background/60 px-4 text-xs text-muted-foreground/60 ring-1 ring-border/40">
                app.stockalert.co/dashboard
              </div>
              <div className="w-16" />
            </div>

            {/* App body */}
            <div className="flex h-[400px] lg:h-[460px]">
              {/* Sidebar */}
              <div className="hidden w-48 shrink-0 flex-col border-r border-border/40 bg-muted/15 p-3 sm:flex">
                <div className="mb-5 flex items-center gap-2 px-2 pt-1">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                    <Bell className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <span className="text-sm font-bold tracking-tight">StockAlert</span>
                </div>
                <nav className="space-y-0.5">
                  {NAV_ITEMS.map((item, i) => (
                    <div
                      key={item}
                      className={`flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-xs font-medium transition-colors ${
                        i === 0
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                      />
                      {item}
                      {item === 'Alerts' && (
                        <span className="ml-auto rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                          23
                        </span>
                      )}
                    </div>
                  ))}
                </nav>
              </div>

              {/* Main content */}
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Top bar */}
                <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/40 px-5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold">Overview</span>
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                      Canlı
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-24 rounded-md bg-muted/60" />
                    <div className="h-6 w-6 rounded-md bg-muted/60" />
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden p-4 lg:p-5">
                  {/* Stats */}
                  <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {MOCK_STATS.map((s) => (
                      <div
                        key={s.label}
                        className="rounded-xl border border-border/40 bg-background/60 p-3"
                      >
                        <div
                          className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${s.accent}18` }}
                        >
                          <TrendingDown className="h-3.5 w-3.5" style={{ color: s.accent }} />
                        </div>
                        <div className="font-mono text-xl font-bold leading-none">{s.value}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Chart + alerts */}
                  <div className="grid flex-1 gap-3 lg:grid-cols-5">
                    {/* Bar chart */}
                    <div className="rounded-xl border border-border/40 bg-background/40 p-4 lg:col-span-3">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold">Stock Level Trends — Last 15 days</span>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="inline-block h-2 w-2 rounded-sm bg-primary/50" />
                            Healthy
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="inline-block h-2 w-2 rounded-sm bg-amber-500/50" />
                            Low
                          </span>
                        </div>
                      </div>
                      <div className="flex h-[88px] items-end gap-1 lg:h-[100px]">
                        {CHART_BARS.map((h, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-t-sm transition-all ${h < 65 ? 'bg-amber-500/40 hover:bg-amber-500/60' : 'bg-primary/30 hover:bg-primary/50'}`}
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Alert list */}
                    <div className="rounded-xl border border-border/40 bg-background/40 p-4 lg:col-span-2">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold">Recent Alerts</span>
                        <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500">
                          23 new
                        </span>
                      </div>
                      <div className="space-y-2">
                        {MOCK_ALERTS.map((a) => (
                          <div
                            key={a.name}
                            className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-background/60 px-3 py-2"
                          >
                            {a.critical ? (
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[11px] font-medium">{a.name}</div>
                              <div className="text-[10px] text-muted-foreground">{a.store}</div>
                            </div>
                            <div
                              className={`shrink-0 font-mono text-[11px] font-bold ${a.critical ? 'text-red-500' : 'text-amber-500'}`}
                            >
                              {a.qty} left
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
