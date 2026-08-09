'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Webhook, BrainCircuit, Users, Bell, SlidersHorizontal, ScrollText } from 'lucide-react'

const FEATURES = [
  { key: 'realtime', Icon: Webhook, accent: '#f97316', bg: '#f9731614' },
  { key: 'ai', Icon: BrainCircuit, accent: '#8b5cf6', bg: '#8b5cf614' },
  { key: 'teams', Icon: Users, accent: '#10b981', bg: '#10b98114' },
  { key: 'channels', Icon: Bell, accent: '#f59e0b', bg: '#f59e0b14' },
  { key: 'rules', Icon: SlidersHorizontal, accent: '#ef4444', bg: '#ef444414' },
  { key: 'audit', Icon: ScrollText, accent: '#6366f1', bg: '#6366f114' },
] as const

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 24 } },
}

export function Features() {
  const t = useTranslations('landing.features')

  return (
    <section id="features" className="py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            {t('title')}
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Grid */}
        <motion.div
          className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          {FEATURES.map(({ key, Icon, accent, bg }, i) => (
            <motion.div
              key={key}
              variants={item}
              whileHover={{ y: -4, boxShadow: `0 12px 40px ${accent}20` }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 cursor-default"
            >
              {/* Subtle corner gradient on hover */}
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                style={{ backgroundColor: accent }}
                aria-hidden
              />

              {/* Number + icon */}
              <div className="mb-4 flex items-start justify-between">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: bg, border: `1px solid ${accent}22` }}
                >
                  <Icon className="h-5 w-5" style={{ color: accent }} />
                </div>
                <span className="font-mono text-xs font-bold text-muted-foreground/30">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>

              <h3 className="mb-2 text-[15px] font-semibold leading-snug">
                {t(`items.${key}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`items.${key}.description`)}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
