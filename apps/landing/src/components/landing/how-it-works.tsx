import { useTranslations } from 'next-intl'
import { Link2, Package, RefreshCw, BellRing } from 'lucide-react'
import { CtaBanner } from './cta-banner'

const STEPS = [
  { key: 'connect', Icon: Link2 },
  { key: 'import', Icon: Package },
  { key: 'sync', Icon: RefreshCw },
  { key: 'alert', Icon: BellRing },
] as const

interface HowItWorksProps {
  /** 'page' (default) renders as a standalone page with an <h1> hero and its
   * own closing CTA. 'section' drops the hero/CTA and demotes the heading to
   * <h2> so it can be embedded inline on the home page, which already has
   * one <h1> (Hero) and its own single closing CtaBanner. */
  variant?: 'page' | 'section'
}

export function HowItWorks({ variant = 'page' }: HowItWorksProps) {
  const t = useTranslations('landing.howItWorks')
  const isSection = variant === 'section'
  const Heading = isSection ? 'h2' : 'h1'

  return (
    <>
      <section className={isSection ? 'px-4 pb-10 text-center sm:px-6 lg:px-8' : 'px-4 pb-10 pt-32 text-center sm:px-6 lg:px-8'}>
        <Heading className="font-heading text-4xl sm:text-5xl">{t('title')}</Heading>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">{t('subtitle')}</p>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {STEPS.map(({ key, Icon }, i) => {
            return (
              <div
                key={key}
                className="flex items-start gap-6 rounded-3xl border border-border/60 bg-card p-7"
              >
                <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-accent">
                  <Icon className="h-5 w-5 text-accent-foreground" strokeWidth={2.75} />
                </div>
                <div>
                  <span className="font-heading text-xs text-primary">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mb-1.5 mt-1 text-xl font-semibold">{t(`steps.${key}.title`)}</h3>
                  <p className="text-[15px] text-muted-foreground">{t(`steps.${key}.description`)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {!isSection && <CtaBanner title={t('ctaTitle')} />}
    </>
  )
}
