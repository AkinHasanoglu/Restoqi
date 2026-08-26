import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Pricing } from '../../../../components/landing/pricing'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing.meta.pricing' })
  return { title: t('title'), description: t('description') }
}

export default function PricingPage() {
  return (
    <div className="pt-16">
      <Pricing />
    </div>
  )
}
