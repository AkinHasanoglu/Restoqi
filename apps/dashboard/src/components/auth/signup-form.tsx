'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { type Locale } from '@stockalert/i18n'
import { Button, Input, Label, Checkbox, TurnstileWidget } from '@stockalert/ui'
import { toast } from '@stockalert/ui'
import { isSupabaseConfigured } from '@stockalert/database/client'
import { signupAction } from '../../actions/auth'

// Every non-validation failure (including "email already registered")
// collapses to the same signupFailed message — see 2nd security audit
// item 7. Only weak_password is safe to call out specifically since it
// reveals nothing about account existence.
function signupErrorMessage(t: ReturnType<typeof useTranslations<'auth'>>, code: string): string {
  switch (code) {
    case 'weak_password':
      return t('errors.weakPassword')
    case 'rate_limited':
      return t('errors.rateLimited')
    case 'accept_terms_required':
      return t('errors.acceptTermsRequired')
    case 'bot_check_failed':
      return t('errors.botCheckFailed')
    default:
      return t('errors.signupFailed')
  }
}

export function SignupForm({ plan }: { plan?: string }) {
  const t = useTranslations('auth')
  const locale = useLocale() as Locale
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [acceptedTerms, setAcceptedTerms] = React.useState(false)
  // Terms/Privacy live on the landing app (apps/landing/.../legal/*), not
  // this one — same pattern as the (auth)/layout.tsx footer links.
  const landingUrl = process.env['NEXT_PUBLIC_LANDING_URL'] ?? ''
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
    if (plan) formData.set('plan', plan)

    const result = await signupAction(formData, window.location.origin, locale)

    if (!result.success) {
      toast.error(signupErrorMessage(t, result.error))
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

        {/* Clickwrap acceptance — actions/auth.ts's signupAction records the
            acceptance timestamp/IP alongside this. Submit stays disabled
            until checked; the server also rejects an unchecked submission
            (SignupSchema.acceptedTerms) as defense in depth against a
            forged request. See compliance audit rule 19. */}
        <div className="flex items-start gap-2">
          <Checkbox
            id="acceptedTerms"
            name="acceptedTerms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="acceptedTerms" className="text-sm font-normal leading-snug text-muted-foreground">
            {t.rich('signup.terms', {
              terms: (chunks) => (
                <Link href={`${landingUrl}/legal/terms`} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href={`${landingUrl}/legal/privacy`} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                  {chunks}
                </Link>
              ),
            })}
          </Label>
        </div>

        {/* Bot check — see apps/dashboard/src/lib/turnstile.ts and the
            landing Trust section's "Turnstile" claim (compliance audit
            rule 07). Hidden entirely (and skipped server-side too) when
            no site key is configured, so local dev/CI aren't blocked. */}
        {turnstileSiteKey ? (
          <TurnstileWidget siteKey={turnstileSiteKey} onVerify={() => setTurnstileVerified(true)} onExpire={() => setTurnstileVerified(false)} />
        ) : null}

        <Button type="submit" className="w-full" disabled={loading || !acceptedTerms || (!!turnstileSiteKey && !turnstileVerified)}>
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
