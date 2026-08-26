'use client'

import * as React from 'react'

interface TurnstileRenderOptions {
  sitekey: string
  callback: (token: string) => void
  'expired-callback'?: () => void
  theme?: 'light' | 'dark' | 'auto'
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
let scriptLoadingPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  scriptLoadingPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Turnstile script'))
    document.head.appendChild(script)
  })
  return scriptLoadingPromise
}

export interface TurnstileWidgetProps {
  siteKey: string
  onVerify: (token: string) => void
  onExpire?: () => void
  className?: string
}

/**
 * Cloudflare Turnstile, rendered via the vanilla `api.js` explicit-render
 * API rather than an npm wrapper — one small component instead of a new
 * dependency. When mounted inside a <form>, Turnstile injects its own
 * hidden `<input name="cf-turnstile-response">`, so a plain
 * `new FormData(formEl)` picks up the token without any extra wiring —
 * server actions read it via `formData.get('cf-turnstile-response')`
 * (see apps/dashboard/src/lib/turnstile.ts). The widget is removed on
 * unmount so its internal state doesn't leak across route changes (e.g.
 * navigating from /login to /signup).
 */
export function TurnstileWidget({ siteKey, onVerify, onExpire, className }: TurnstileWidgetProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const widgetIdRef = React.useRef<string | undefined>(undefined)
  // Refs (not deps) for the callbacks so a caller passing an inline arrow
  // function doesn't re-render/re-mount the widget on every parent render.
  const onVerifyRef = React.useRef(onVerify)
  const onExpireRef = React.useRef(onExpire)
  onVerifyRef.current = onVerify
  onExpireRef.current = onExpire

  React.useEffect(() => {
    let cancelled = false
    void loadTurnstileScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => onVerifyRef.current(token),
        'expired-callback': () => onExpireRef.current?.(),
      })
    })
    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
      }
    }
  }, [siteKey])

  return <div ref={containerRef} className={className} />
}
