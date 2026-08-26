import * as Sentry from '@sentry/nextjs'
import { scrub } from '@stockalert/config/sentry-scrub'

Sentry.init({
  dsn: process.env['NEXT_PUBLIC_SENTRY_DSN_DASHBOARD'],
  tracesSampleRate: 0.1,
  debug: false,
  // Credentials must never reach Sentry, even accidentally via a caught
  // error's context (e.g. a connector throwing with request details attached).
  beforeSend(event) {
    return scrub(event) as typeof event
  },
})
