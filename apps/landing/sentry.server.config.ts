import * as Sentry from '@sentry/nextjs'
import { scrub } from '@stockalert/config/sentry-scrub'

Sentry.init({
  dsn: process.env['NEXT_PUBLIC_SENTRY_DSN_LANDING'],
  tracesSampleRate: 0.1,
  debug: false,
  beforeSend(event) {
    return scrub(event) as typeof event
  },
})
