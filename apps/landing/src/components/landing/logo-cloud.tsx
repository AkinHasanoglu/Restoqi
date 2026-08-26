import { useTranslations } from 'next-intl'

const PLATFORMS = [
  { name: 'Shopify', color: '#96BF48', bg: '#96BF4818' },
  { name: 'Trendyol', color: '#F27A1A', bg: '#F27A1A18' },
  { name: 'Amazon', color: '#B7791F', bg: '#B7791F18' },
  { name: 'Etsy', color: '#D2601A', bg: '#D2601A18' },
  { name: 'eBay', color: '#C0392B', bg: '#C0392B18' },
  { name: 'Hepsiburada', color: '#D2540A', bg: '#D2540A18' },
  { name: 'AliExpress', color: '#D2453D', bg: '#D2453D18' },
]

export function LogoCloud() {
  const t = useTranslations('landing.solutions')

  return (
    <section className="relative overflow-hidden border-y border-border/50 bg-muted/20 py-14">
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 28s linear infinite;
          will-change: transform;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
        /* WCAG 2.1 AA 2.3.3 (compliance audit rule 13) — an infinite
           scrolling animation is exactly what prefers-reduced-motion
           exists to suppress for users who've opted out of it at the OS
           level (vestibular disorders, motion sensitivity). */
        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none;
          }
        }
      `}</style>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
          {t('subtitle')}
        </p>
      </div>

      {/* Scrolling ticker */}
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="marquee-track flex w-max gap-3">
          {/* Duplicate list for seamless loop */}
          {[...PLATFORMS, ...PLATFORMS].map(({ name, color, bg }, i) => (
            <div
              key={`${name}-${i}`}
              className="flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-105"
              style={{
                borderColor: `${color}30`,
                backgroundColor: bg,
                color,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
