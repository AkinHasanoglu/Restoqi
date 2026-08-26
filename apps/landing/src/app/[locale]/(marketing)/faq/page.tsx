import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Faq } from '../../../../components/landing/faq'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing.meta.faq' })
  return { title: t('title'), description: t('description') }
}

export default function FaqPage() {
  return <Faq />
}
