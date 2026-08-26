'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { type Locale } from '@stockalert/i18n'
import { Button, Input, Label, Separator, TurnstileWidget } from '@stockalert/ui'
import { toast } from '@stockalert/ui'
import { createClient, isSupabaseConfigured } from '@stockalert/database/client'
import { loginAction, magicLinkAction } from '../../actions/auth'

// Auth error codes returned by actions/auth.ts map to translated strings
// here rather than forwarding whatever Supabase's SDK said — see 2nd
// security audit item 7 (account enumeration via error messages).
function authErrorMessage(t: ReturnType<typeof useTranslations<'auth'>>, code: string): string {
  switch (code) {
    case 'rate_limited':
      return t('errors.rateLimited')
    case 'invalid_input':
      return t('errors.invalidInput')
    case 'bot_check_failed':
      return t('errors.botCheckFailed')
    default:
      return t('errors.invalidCredentials')
  }
}

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const t = useTranslations('auth')
  const locale = useLocale() as Locale
  const [loading, setLoading] = React.useState(false)
  const turnstileSiteKey = process.env['NEXT_PUBLIC_TURNSTILE_SITE_KEY']
  const [turnstileVerified, setTurnstileVerified] = React.useState(false)

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    if (redirectTo) formData.set('redirectTo', redirectTo)

    const result = await loginAction(formData, locale)

    if (!result.success) {
      toast.error(authErrorMessage(t, result.error))
      setLoading(false)
      return
    }

    window.location.href = result.data.redirectTo
  }

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const result = await magicLinkAction(formData, window.location.origin, locale)

    if (!result.success) {
      toast.error(authErrorMessage(t, result.error))
    } else {
      toast.success('Check your email for a magic link!')
    }
    setLoading(false)
  }

  async function handleOAuth(provider: 'google' | 'github') {
    const supabase = createClient()
    // redirectTo is client-supplied (the page's ?redirectTo= search param) —
    // encode it so it can't inject extra query params into the callback URL.
    // The callback route (api/auth/callback) independently re-validates
    // `next` as an internal-only path before ever redirecting to it, so this
    // is defense-in-depth, not the actual open-redirect guard.
    const next = encodeURIComponent(redirectTo ?? `/${locale}/overview`)
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/api/auth/callback?next=${next}` },
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

        {/* Bot check — see apps/dashboard/src/lib/turnstile.ts; hidden and
            skipped server-side when no site key is configured. */}
        {turnstileSiteKey ? (
          <TurnstileWidget siteKey={turnstileSiteKey} onVerify={() => setTurnstileVerified(true)} onExpire={() => setTurnstileVerified(false)} />
        ) : null}

        <Button type="submit" className="w-full" disabled={loading || (!!turnstileSiteKey && !turnstileVerified)}>
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
