import { useTranslations } from 'next-intl'

const PLATFORMS = [
  { name: 'Shopify', color: '#96BF48', bg: '#96BF4812' },
  { name: 'Trendyol', color: '#F27A1A', bg: '#F27A1A12' },
  { name: 'Amazon', color: '#FF9900', bg: '#FF990012' },
  { name: 'Etsy', color: '#F56400', bg: '#F5640012' },
  { name: 'eBay', color: '#E53238', bg: '#E5323812' },
  { name: 'Hepsiburada', color: '#FF6000', bg: '#FF600012' },
  { name: 'AliExpress', color: '#FF4747', bg: '#FF474712' },
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
