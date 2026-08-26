'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

/**
 * Mirrors apps/dashboard/src/app/global-error.tsx — see that file's
 * comment. Marketing site has no per-segment error.tsx of its own since
 * it's a handful of mostly-static pages; this single boundary is enough
 * to make sure a React render error on the landing site is reported to
 * Sentry and shows a branded fallback instead of Next's bare default.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>
            An unexpected error occurred. Our team has been notified automatically.
          </p>
          <button
            onClick={reset}
            style={{
              backgroundColor: '#0f172a',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
