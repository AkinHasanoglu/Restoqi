'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { type Locale } from '@stockalert/i18n'
import { Button, Input, Label, Separator } from '@stockalert/ui'
import { toast } from '@stockalert/ui'
import { createClient, isSupabaseConfigured } from '@stockalert/database/client'

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const t = useTranslations('auth')
  const locale = useLocale() as Locale
  const [loading, setLoading] = React.useState(false)

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

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(t('errors.invalidCredentials'))
      setLoading(false)
      return
    }

    window.location.href = redirectTo ?? `/${locale}/overview`
  }

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/${locale}/overview` },
    })

    if (error) {
      toast.error(t('errors.invalidCredentials'))
    } else {
      toast.success('Check your email for a magic link!')
    }
    setLoading(false)
  }

  async function handleOAuth(provider: 'google' | 'github') {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/api/auth/callback?next=${redirectTo ?? `/${locale}/overview`}` },
    })
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t('login.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('login.subtitle')}</p>
      </div>

      {/* Email/password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('login.email')}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('login.password')}</Label>
            <Link href={`/${locale}/forgot-password`} className="text-xs text-muted-foreground hover:text-foreground">
              {t('login.forgotPassword')}
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? '…' : t('login.submit')}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Separator className="flex-1" />
        {t('login.orContinueWith')}
        <Separator className="flex-1" />
      </div>

      {/* OAuth */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" type="button" onClick={() => handleOAuth('google')}>
          Google
        </Button>
        <Button variant="outline" type="button" onClick={() => handleOAuth('github')}>
          GitHub
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t('login.noAccount')}{' '}
        <Link href={`/${locale}/signup`} className="font-medium text-foreground hover:underline">
          {t('login.signUp')}
        </Link>
      </p>
    </div>
  )
}
