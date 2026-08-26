import { type NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@stockalert/database/server'
import { sanitizeNextPath } from '../../../../lib/safe-redirect'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'), '/overview')

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Trust the app's own configured origin, not the x-forwarded-host
      // request header — a header is client-influenced input, and
      // building the redirect target from it (as this used to) is host
      // confusion waiting for a misconfigured proxy in front of it.
      // NEXT_PUBLIC_APP_URL is the one place that origin is meant to
      // come from; `origin` (derived from this same request) is only a
      // fallback for local dev where that env var may be unset.
      const appOrigin = process.env['NEXT_PUBLIC_APP_URL'] ?? origin
      return NextResponse.redirect(`${appOrigin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
}
