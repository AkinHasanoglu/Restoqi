import * as Sentry from '@sentry/nextjs'
import { scrub } from '@stockalert/config/sentry-scrub'

Sentry.init({
  dsn: process.env['NEXT_PUBLIC_SENTRY_DSN_DASHBOARD'],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    // Explicit, not just relying on SDK defaults — this dashboard has a
    // settings/api-keys form where users paste marketplace API keys, and
    // session replay records DOM/network by default.
    Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true }),
  ],
  beforeSend(event) {
    return scrub(event) as typeof event
  },
})
