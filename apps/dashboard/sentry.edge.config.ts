import * as Sentry from '@sentry/nextjs'
import { scrub } from '@stockalert/config/sentry-scrub'

Sentry.init({
  dsn: process.env['NEXT_PUBLIC_SENTRY_DSN_DASHBOARD'],
  tracesSampleRate: 0.1,
  beforeSend(event) {
    return scrub(event) as typeof event
  },
})
