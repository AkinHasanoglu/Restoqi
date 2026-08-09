'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { type Locale } from '@stockalert/i18n'
import { Button, Input, Label } from '@stockalert/ui'
import { toast } from '@stockalert/ui'
import { createClient, isSupabaseConfigured } from '@stockalert/database/client'

export function SignupForm({ plan }: { plan?: string }) {
  const t = useTranslations('auth')
  const locale = useLocale() as Locale
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto w-full max-w-sm space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950">
        <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">Supabase yapılandırılmadı</h2>
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Dashboard&apos;u kullanmak için Supabase bilgilerini{' '}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">apps/dashboard/.env.local</code>{' '}
          dosyasına ekleyin:
        </p>
        <pre className="overflow-auto rounded bg-amber-100 p-3 text-xs dark:bg-amber-900">
          {`NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...`}
        </pre>
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Ücretsiz proje: supabase.com/dashboard
        </p>
      </div>
    )
  }

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('name') as string

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, plan: plan ?? 'starter' },
        emailRedirectTo: `${window.location.origin}/${locale}/overview`,
      },
    })

    if (error) {
      if (error.message.includes('already')) {
        toast.error(t('errors.emailAlreadyExists'))
      } else {
        toast.error(t('errors.weakPassword'))
      }
      setLoading(false)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
          ✉️
        </div>
        <h2 className="text-xl font-bold">{t('verifyEmail.title')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a link to your email. Click it to activate your account.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t('signup.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('signup.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">{t('signup.name')}</Label>
          <Input id="name" name="name" type="text" autoComplete="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('signup.email')}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">
            {t('signup.password')}
            <span className="ml-2 text-xs text-muted-foreground">({t('signup.passwordHint')})</span>
          </Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? '…' : t('signup.submit')}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('signup.hasAccount')}{' '}
        <Link href={`/${locale}/login`} className="font-medium text-foreground hover:underline">
          {t('signup.signIn')}
        </Link>
      </p>
    </div>
  )
}
