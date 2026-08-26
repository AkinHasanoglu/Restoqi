import { useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { Button } from '@stockalert/ui'
import { env } from '../../env'

interface CtaBannerProps {
  title: string
  subtitle?: string
}

// Shared closing CTA block — previously copy-pasted verbatim into
// how-it-works.tsx, integrations.tsx and faq.tsx (same rounded-primary
// banner, same button). Centralizing it means the CTA styling and copy
// only need to change in one place.
export function CtaBanner({ title, subtitle }: CtaBannerProps) {
  const tHero = useTranslations('landing.hero')
  const dashboardUrl = env.NEXT_PUBLIC_APP_URL

  return (
    <section className="px-4 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-[36px] bg-primary px-10 py-16 text-center text-primary-foreground">
        <h2 className="font-heading text-3xl sm:text-4xl">{title}</h2>
        {subtitle && <p className="mx-auto mt-3 max-w-md text-[15px] opacity-90">{subtitle}</p>}
        <div className="mt-7">
          <Button
            size="lg"
            variant="secondary"
            className="h-12 gap-2 rounded-full bg-background px-8 text-[15px] font-semibold text-foreground shadow-md hover:bg-card"
            asChild
          >
            <a href={`${dashboardUrl}/signup`}>
              {tHero('cta')}
              <ArrowRight className="h-4 w-4" strokeWidth={2.75} />
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
