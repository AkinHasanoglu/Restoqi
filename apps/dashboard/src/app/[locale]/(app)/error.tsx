'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'
import { Button, Card, CardContent } from '@stockalert/ui'

/**
 * Segment error boundary for every route under (app) — products, alerts,
 * settings, etc. Next only renders this on a render/data-fetching throw;
 * without it those errors fell through to Next's bare, unbranded default
 * error screen and were never reported anywhere, since Sentry's own
 * instrumentation only captures what an error boundary hands it. See the
 * "batırma listesi" audit item 14 — Sentry was fully configured
 * (instrumentation.ts, sentry.*.config.ts) but had nothing wired up to
 * actually call it from a React render error.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('common.errorBoundary')

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">{t('title')}</h2>
            <p className="text-sm text-muted-foreground">{t('description')}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={reset}>{t('retry')}</Button>
            <Button variant="outline" asChild>
              <a href="/">{t('goHome')}</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
