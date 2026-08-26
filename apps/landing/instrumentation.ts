import type { Instrumentation } from 'next'

export async function register() {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    // Same fix as apps/dashboard/instrumentation.ts: env/index.ts was
    // never imported anywhere, so its validation never ran.
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
