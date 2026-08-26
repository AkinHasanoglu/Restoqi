'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import { CtaBanner } from './cta-banner'

interface FaqItem {
  q: string
  a: string
}

interface FaqProps {
  /** See how-it-works.tsx's variant doc — 'section' embeds this inline on
   * the home page (h2, no hero padding, no own closing CTA). */
  variant?: 'page' | 'section'
}

export function Faq({ variant = 'page' }: FaqProps) {
  const t = useTranslations('landing.faq')
  const items = t.raw('items') as FaqItem[]
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const isSection = variant === 'section'
  const Heading = isSection ? 'h2' : 'h1'

  return (
    <>
      <section className={isSection ? 'px-4 pb-10 text-center sm:px-6 lg:px-8' : 'px-4 pb-10 pt-32 text-center sm:px-6 lg:px-8'}>
        <Heading className="font-heading text-4xl sm:text-5xl">{t('title')}</Heading>
      </section>

      <section className={isSection ? 'px-4 pb-16 sm:px-6 lg:px-8' : 'px-4 pb-24 sm:px-6 lg:px-8'}>
        <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
          {items.map((item, i) => {
            const open = openIndex === i
            return (
              <div key={item.q} className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                <button
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left text-[15px] font-semibold"
                  aria-expanded={open}
                >
                  {item.q}
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-primary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    strokeWidth={2.75}
                  />
                </button>
                {open && (
                  <p className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {!isSection && <CtaBanner title={t('ctaTitle')} subtitle={t('ctaSubtitle')} />}
    </>
  )
}
