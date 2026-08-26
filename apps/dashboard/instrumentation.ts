import type { Instrumentation } from 'next'

export async function register() {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    // Was never imported anywhere in the app, so its zod validation
    // (SUPABASE_ENCRYPTION_KEY shape, and now UPSTASH_REDIS_REST_*/
    // WORKER_SECRET required in production) silently never ran — a
    // misconfigured or missing production env var would only surface as
    // a downstream runtime symptom (rate limiting/replay protection
    // silently absent) instead of failing the boot loudly. Importing it
    // here, once, at server start makes `createEnv`'s throw-on-invalid
    // actually take effect.
    await import('./src/env')
    await import('./sentry.server.config')
  }
  if (process.env['NEXT_RUNTIME'] === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Forwards unhandled server-side errors (route handlers, server components,
// server actions) to the Monitoring Hub (external app, not in this repo).
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { reportToHub } = await import('./src/lib/hub-reporter')
  await reportToHub({
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    severity: 'high',
    context: {
      path: request.path,
      method: request.method,
      routeType: context.routeType,
      routePath: context.routePath,
    },
  })
}
