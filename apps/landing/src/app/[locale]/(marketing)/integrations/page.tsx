import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Integrations } from '../../../../components/landing/integrations'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing.meta.integrations' })
  return { title: t('title'), description: t('description') }
}

export default function IntegrationsPage() {
  return <Integrations />
}
