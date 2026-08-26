'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

/**
 * Last-resort boundary for errors thrown by the root layout itself (very
 * rare — e.g. next-intl's message loader throwing before
 * NextIntlClientProvider mounts). Next requires this file to render its
 * own <html>/<body> since it replaces the entire root layout when active,
 * which also means no locale/translation context is available here —
 * see (app)/error.tsx for the localized boundary that catches everything
 * else. Hardcoded English is the correct fallback for a screen this rare
 * rather than a broken i18n call.
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
