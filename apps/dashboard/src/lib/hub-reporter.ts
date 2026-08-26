import { scrub } from '@stockalert/config/sentry-scrub'

/**
 * Reports an error to the Monitoring Hub's internal webhook (external app, not in this repo).
 * A silent no-op if HUB_URL / HUB_WEBHOOK_SECRET / APP_NAME aren't
 * configured — the hub is optional infrastructure and must never be a
 * reason this app breaks.
 */
export interface ReportToHubPayload {
  message: string
  stack?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  context?: Record<string, unknown>
}

export async function reportToHub(payload: ReportToHubPayload): Promise<void> {
  const hubUrl = process.env['HUB_URL']
  const hubSecret = process.env['HUB_WEBHOOK_SECRET']
  const appName = process.env['APP_NAME']
  // "production" | "local" — must match the environment this app+name was
  // registered under on the Hub's Applications page, or the webhook 404s.
  const environment = process.env['HUB_ENVIRONMENT'] || 'production'

  if (!hubUrl || !hubSecret || !appName) return

  // Unlike Sentry, nothing here parses `stack` back into structured data —
  // it's opaque text to the Hub — so context is scrubbed before being
  // flattened into it, same REDACTED_KEYS list as every Sentry config.
  const scrubbedContext = payload.context ? scrub(payload.context) : null
  const stack = [payload.stack, scrubbedContext ? `Context: ${JSON.stringify(scrubbedContext)}` : null]
    .filter(Boolean)
    .join('\n\n')

  try {
    await fetch(`${hubUrl.replace(/\/+$/, '')}/api/webhooks/errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hubSecret}`,
      },
      body: JSON.stringify({
        app: appName,
        environment,
        message: payload.message,
        stack: stack || undefined,
        severity: payload.severity ?? 'high',
      }),
      signal: AbortSignal.timeout(3000),
      keepalive: true,
    })
  } catch {
    // Swallow — monitoring must never break the app it's monitoring.
  }
}
