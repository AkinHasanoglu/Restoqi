'use client'

import * as React from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { type Locale } from '@stockalert/i18n'
import { Button, Input, Label } from '@stockalert/ui'
import { toast } from '@stockalert/ui'
import { createClient, isSupabaseConfigured } from '@stockalert/database/client'

// The recovery link (packages/database/supabase/config.toml's
// otp_expiry=900) lands here with the token in the URL fragment; the
// Supabase browser client auto-exchanges it into a short-lived recovery
// session (detectSessionInUrl, on by default), which is what
// updateUser({ password }) below authenticates against. Previously this
// route had no page at all, so recovery links 404'd — see 2nd security
// audit item 8.
function ResetPasswordForm() {
  const t = useTranslations('auth')
  const locale = useLocale() as Locale
  const [loading, setLoading] = React.useState(false)
  const [checkingSession, setCheckingSession] = React.useState(true)
  const [hasRecoverySession, setHasRecoverySession] = React.useState(false)
  const [success, setSuccess] = React.useState(false)

  const supabase = React.useMemo(() => (isSupabaseConfigured ? createClient() : null), [])

  React.useEffect(() => {
    if (!supabase) {
      setCheckingSession(false)
      return
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      setHasRecoverySession(!!user)
      setCheckingSession(false)
    })
  }, [supabase])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!supabase) return

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password.length < 8) {
      toast.error(t('errors.weakPassword'))
      return
    }
    if (password !== confirmPassword) {
      toast.error(t('errors.weakPassword'))
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      toast.error(t('errors.linkExpired'))
      return
    }

    setSuccess(true)
    window.location.href = `/${locale}/overview`
  }

  if (checkingSession) {
    return null
  }

  if (!hasRecoverySession) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <p className="text-sm">{t('errors.linkExpired')}</p>
        <Link href={`/${locale}/forgot-password`} className="mt-4 block text-sm text-primary hover:underline">
          {t('forgotPassword.title')}
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <p className="text-sm">{t('resetPassword.success')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t('resetPassword.title')}</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">{t('resetPassword.password')}</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">{t('resetPassword.confirmPassword')}</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? '…' : t('resetPassword.submit')}
        </Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
