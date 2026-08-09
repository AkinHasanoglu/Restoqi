'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import type { Metadata } from 'next'
import { Button, Input, Label } from '@stockalert/ui'
import { toast } from '@stockalert/ui'
import { createClient } from '@stockalert/database/client'
import { type Locale } from '@stockalert/i18n'

function ForgotPasswordForm() {
  const t = useTranslations('auth')
  const locale = useLocale() as Locale
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const email = (new FormData(e.currentTarget)).get('email') as string

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/${locale}/reset-password`,
    })

    if (error) {
      toast.error(t('errors.emailNotFound'))
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <p className="text-sm">{t('forgotPassword.sent')}</p>
        <Link href={`/${locale}/login`} className="mt-4 block text-sm text-primary hover:underline">
          {t('forgotPassword.backToLogin')}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t('forgotPassword.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('forgotPassword.subtitle')}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('forgotPassword.email')}</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? '…' : t('forgotPassword.submit')}
        </Button>
      </form>
      <Link href={`/${locale}/login`} className="block text-center text-sm text-muted-foreground hover:text-foreground">
        {t('forgotPassword.backToLogin')}
      </Link>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
