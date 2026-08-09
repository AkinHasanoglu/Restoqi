import type { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import { LogoCloud } from '../../../../components/landing/logo-cloud'

export const metadata: Metadata = {
  title: 'Solutions',
}

function SolutionsContent() {
  const t = useTranslations('landing.solutions')
  return (
    <div className="pt-24">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h1 className="text-4xl font-bold">{t('title')}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t('subtitle')}</p>
      </div>
      <LogoCloud />
    </div>
  )
}

export default function SolutionsPage() {
  return <SolutionsContent />
}
