import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { ArrowRight, Zap, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button, Badge, Logo } from '@stockalert/ui'
import { locales, type Locale } from '@stockalert/i18n'
import { TRIAL_DAYS } from '@stockalert/plans'
import { env } from '../../env'

// Kept in sync with apps/dashboard/src/lib/connector-registry.ts, whose
// `connectors` map has exactly these 7 entries — there's no shared export
// for "marketplace count" alone, so this is a plain literal rather than an
// import to avoid pulling the (server-only, per-connector) registry into
// the landing bundle for a single number.
const MARKETPLACE_COUNT = 7

const CHART_BARS = [55, 72, 48, 88, 65, 94, 71, 83, 57, 76, 91, 62, 85, 73, 96]

const MOCK_ALERTS = [
  { name: 'Nike Air Max 90', store: 'Shopify', qty: 3, critical: true },
  { name: 'Samsung Galaxy S24', store: 'Trendyol', qty: 7, critical: true },
  { name: "Levi's 501 Original", store: 'Amazon', qty: 14, critical: false },
]

const MOCK_STAT_KEYS = ['products', 'lowStock', 'stores', 'uptime'] as const
const MOCK_STAT_ICONS = { products: TrendingDown, lowStock: AlertTriangle, stores: Zap, uptime: CheckCircle2 } as const
const MOCK_STAT_VALUES = { products: '12.847', lowStock: '23', stores: '7', uptime: '%99,9' } as const
const MOCK_STAT_SAGE = { products: false, lowStock: false, stores: true, uptime: true } as const

const NAV_ITEM_KEYS = ['overview', 'products', 'alerts', 'rules', 'integrations'] as const

export function Hero() {
  const t = useTranslations('landing.hero')
  const locale = useLocale() as Locale
  const dashboardUrl = env.NEXT_PUBLIC_APP_URL

  return (
    <section className="relative overflow-hidden pb-24 pt-32">
      {/* Warm blurred blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute -top-32 right-[-100px] h-[420px] w-[420px] rounded-full bg-primary/20 blur-[70px]" />
        <div className="absolute top-56 -left-20 h-64 w-64 rounded-full bg-accent-2/20 blur-[60px]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Text block */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-7 flex justify-center">
            <Badge
              variant="outline"
              className="gap-1.5 rounded-full border-transparent bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground"
            >
              <Zap className="h-3.5 w-3.5" strokeWidth={2.75} />
              {t('badge')}
            </Badge>
          </div>

          <h1 className="font-heading text-5xl leading-[1.08] sm:text-6xl lg:text-[68px]">
            {t('title')}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {t('subtitle')}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-12 gap-2 rounded-full px-8 text-[15px] font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-xl"
              asChild
            >
              <a href={`${dashboardUrl}/signup`}>
                {t('cta')}
                <ArrowRight className="h-4 w-4" strokeWidth={2.75} />
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 rounded-full border-border px-8 text-[15px]"
              asChild
            >
              <Link href={`/${locale}/how-it-works`}>{t('ctaSecondary')}</Link>
            </Button>
          </div>

          <p className="mt-5 text-sm text-muted-foreground/80">
            {t('trustSignals', { marketplaces: MARKETPLACE_COUNT, trialDays: TRIAL_DAYS, languages: locales.length })}
          </p>
        </div>

        {/* Dashboard mockup */}
        <div className="relative mt-16">
          <div
            className="pointer-events-none absolute inset-x-16 -top-6 -bottom-6 rounded-[40px] opacity-50"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.18), transparent 70%)' }}
            aria-hidden
          />

          <div className="relative overflow-hidden rounded-[32px] border border-border/60 bg-card shadow-2xl">
            {/* Browser bar */}
            <div className="flex h-11 items-center justify-between border-b border-border/50 bg-muted/40 px-5">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-primary/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-accent-2/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
              </div>
              <div className="flex h-6 items-center justify-center rounded-full bg-background/70 px-4 text-xs text-muted-foreground/70">
                app.stockalert.co/dashboard
              </div>
              <div className="w-16" />
            </div>

            {/* App body */}
            <div className="flex h-[400px] lg:h-[460px]">
              {/* Sidebar */}
              <div className="hidden w-48 shrink-0 flex-col border-r border-border/40 bg-muted/25 p-3 sm:flex">
                <div className="mb-5 flex items-center gap-2 px-2 pt-1">
                  <Logo compact height={24} />
                  <span className="font-heading text-sm">StockAlert</span>
                </div>
                <nav className="space-y-0.5">
                  {NAV_ITEM_KEYS.map((key, i) => (
                    <div
                      key={key}
                      className={`flex h-8 items-center gap-2.5 rounded-full px-2.5 text-xs font-semibold transition-colors ${
                        i === 0
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                      />
                      {t(`mockup.nav.${key}`)}
                      {key === 'alerts' && (
                        <span className="ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
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
                    <span className="text-sm font-semibold">{t('mockup.nav.overview')}</span>
                    <span className="flex items-center gap-1 rounded-full bg-accent-2/15 px-2 py-0.5 text-[10px] font-semibold text-accent-2">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-2" />
                      {t('mockup.live')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-24 rounded-full bg-muted/60" />
                    <div className="h-6 w-6 rounded-full bg-muted/60" />
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden p-4 lg:p-5">
                  {/* Stats */}
                  <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {MOCK_STAT_KEYS.map((key) => {
                      const Icon = MOCK_STAT_ICONS[key]
                      const sage = MOCK_STAT_SAGE[key]
                      return (
                        <div
                          key={key}
                          className="rounded-2xl border border-border/40 bg-background/60 p-3"
                        >
                          <div
                            className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full ${sage ? 'bg-accent-2/15' : 'bg-primary/15'}`}
                          >
                            <Icon
                              className={`h-3.5 w-3.5 ${sage ? 'text-accent-2' : 'text-primary'}`}
                              strokeWidth={2.75}
                            />
                          </div>
                          <div className="font-heading text-xl leading-none">{MOCK_STAT_VALUES[key]}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground">{t(`mockup.stats.${key}`)}</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Chart + alerts */}
                  <div className="grid flex-1 gap-3 lg:grid-cols-5">
                    {/* Bar chart */}
                    <div className="rounded-2xl border border-border/40 bg-background/40 p-4 lg:col-span-3">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold">{t('mockup.chartTitle')}</span>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="inline-block h-2 w-2 rounded-sm bg-accent-2/50" />
                            {t('mockup.healthy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="inline-block h-2 w-2 rounded-sm bg-primary/50" />
                            {t('mockup.low')}
                          </span>
                        </div>
                      </div>
                      <div className="flex h-[88px] items-end gap-1 lg:h-[100px]">
                        {CHART_BARS.map((h, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-t-sm transition-all ${h < 65 ? 'bg-primary/40 hover:bg-primary/60' : 'bg-accent-2/35 hover:bg-accent-2/55'}`}
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Alert list */}
                    <div className="rounded-2xl border border-border/40 bg-background/40 p-4 lg:col-span-2">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold">{t('mockup.recentAlerts')}</span>
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {t('mockup.newCount', { count: 23 })}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {MOCK_ALERTS.map((a) => (
                          <div
                            key={a.name}
                            className="flex items-center gap-2.5 rounded-xl border border-border/30 bg-background/60 px-3 py-2"
                          >
                            {a.critical ? (
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.75} />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent-2" strokeWidth={2.75} />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[11px] font-medium">{a.name}</div>
                              <div className="text-[10px] text-muted-foreground">{a.store}</div>
                            </div>
                            <div
                              className={`shrink-0 font-heading text-[11px] ${a.critical ? 'text-primary' : 'text-accent-2'}`}
                            >
                              {t('mockup.qtyLeft', { count: a.qty })}
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
