import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { HowItWorks } from '../../../../components/landing/how-it-works'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing.meta.howItWorks' })
  return { title: t('title'), description: t('description') }
}

export default function HowItWorksPage() {
  return <HowItWorks />
}
