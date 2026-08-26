import type { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { Mail } from 'lucide-react'
import { env } from '../../../../env'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing.meta.contact' })
  return { title: t('title'), description: t('description') }
}

function ContactContent() {
  const t = useTranslations('landing.contact')
  const supportEmail = env.NEXT_PUBLIC_SUPPORT_EMAIL

  return (
    <div className="mx-auto max-w-2xl px-4 py-32 text-center">
      <h1 className="font-heading text-4xl sm:text-5xl">{t('title')}</h1>
      <p className="mt-5 text-lg text-muted-foreground">{t('subtitle')}</p>

      {supportEmail ? (
        <a
          href={`mailto:${supportEmail}`}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl"
        >
          <Mail className="h-4 w-4" strokeWidth={2.75} />
          {t('emailLabel')}
        </a>
      ) : null}

      <p className="mt-5 text-sm text-muted-foreground/80">{t('supportNote')}</p>
    </div>
  )
}

export default function ContactPage() {
  return <ContactContent />
}
