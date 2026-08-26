import type { Metadata } from 'next'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { BookOpen } from 'lucide-react'
import { type Locale } from '@stockalert/i18n'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing.meta.docs' })
  return { title: t('title'), description: t('description') }
}

function DocsContent() {
  const t = useTranslations('landing.docsPage')
  const tContact = useTranslations('landing.contact')
  const locale = useLocale() as Locale

  return (
    <div className="mx-auto max-w-3xl px-4 py-32 text-center">
      <h1 className="font-heading text-4xl sm:text-5xl">{t('title')}</h1>
      <p className="mt-5 text-lg text-muted-foreground">{t('subtitle')}</p>
      <div className="mx-auto mt-12 flex max-w-md flex-col items-center gap-3 rounded-3xl border border-border/60 bg-card p-10">
        <BookOpen className="h-8 w-8 text-primary" strokeWidth={2.25} />
        <p className="text-sm text-muted-foreground">{t('emptyState')}</p>
        <Link href={`/${locale}/contact`} className="mt-2 text-sm font-semibold text-primary hover:underline">
          {tContact('title')} →
        </Link>
      </div>
    </div>
  )
}

export default function DocsPage() {
  return <DocsContent />
}
