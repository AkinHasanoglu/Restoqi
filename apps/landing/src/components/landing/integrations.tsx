import { useTranslations } from 'next-intl'
import { LogoCloud } from './logo-cloud'
import { CtaBanner } from './cta-banner'

const INTEGRATION_CARDS = [
  { key: 'shopify', color: '#96BF48' },
  { key: 'trendyol', color: '#F27A1A' },
  { key: 'amazon', color: '#B7791F' },
  { key: 'etsy', color: '#D2601A' },
  { key: 'ebay', color: '#C0392B' },
  { key: 'hepsiburada', color: '#D2540A' },
] as const

export function Integrations() {
  const t = useTranslations('landing.integrations')
  const tCommon = useTranslations('common')

  return (
    <>
      <section className="px-4 pb-6 pt-32 text-center sm:px-6 lg:px-8">
        <h1 className="font-heading text-4xl sm:text-5xl">{t('title')}</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">{t('subtitle')}</p>
      </section>

      <LogoCloud />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATION_CARDS.map(({ key, color }) => (
            <div
              key={key}
              className="flex flex-col gap-2.5 rounded-3xl border border-border/60 bg-card p-6"
            >
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-heading text-base">
                  {tCommon(`platforms.${key}` as Parameters<typeof tCommon>[0])}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{t(`cards.${key}`)}</p>
            </div>
          ))}
        </div>
      </section>

      <CtaBanner title={t('ctaTitle')} />
    </>
  )
}
