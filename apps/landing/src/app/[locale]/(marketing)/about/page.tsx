import type { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing.meta.about' })
  return { title: t('title'), description: t('description') }
}

function AboutContent() {
  const t = useTranslations('landing.about')
  return (
    <div className="mx-auto max-w-3xl px-4 py-32 text-center">
      <h1 className="font-heading text-4xl sm:text-5xl">{t('title')}</h1>
      <p className="mt-5 text-lg text-muted-foreground">{t('subtitle')}</p>
      <p className="mx-auto mt-8 max-w-2xl text-left text-[15px] leading-relaxed text-muted-foreground">
        {t('body')}
      </p>
    </div>
  )
}

export default function AboutPage() {
  return <AboutContent />
}
