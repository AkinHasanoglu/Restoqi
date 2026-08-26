'use client'

import * as React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@stockalert/ui'
import { acceptInvite } from '../../../../actions/team'

export default function AcceptInvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const locale = useLocale()
  const token = searchParams.get('token') ?? ''
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = React.useState('')

  async function handleAccept() {
    if (status === 'loading') return
    setStatus('loading')
    const result = await acceptInvite(token)
    if (result.success) {
      setStatus('success')
      setTimeout(() => router.push(`/${locale}/overview`), 1500)
    } else {
      setStatus('error')
      setError(result.error)
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <p className="text-sm text-destructive">Invalid invitation link.</p>
      </div>
    )
  }

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle>Team Invitation</CardTitle>
        <CardDescription>You&apos;ve been invited to join a team on StockAlert.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'success' && (
          <p className="text-sm text-success-foreground">You joined the team! Redirecting…</p>
        )}
        {status === 'error' && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {(status === 'idle' || status === 'loading' || status === 'error') && (
          <Button onClick={handleAccept} className="w-full" disabled={status === 'loading'}>
            {status === 'loading' ? 'Accepting…' : 'Accept invitation'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
