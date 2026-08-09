import { type NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { createMiddlewareClient } from '@stockalert/database/middleware'
import { locales, defaultLocale } from '@stockalert/i18n'

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
})

const PUBLIC_AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/accept-invite']
const PROTECTED_PREFIX = '/[locale]/(app)'

function isPublicAuthRoute(pathname: string) {
  return PUBLIC_AUTH_ROUTES.some((route) =>
    locales.some((locale) => pathname.startsWith(`/${locale}${route}`) || pathname === route)
  )
}

function isAppRoute(pathname: string) {
  // /overview, /products, /alerts, /rules, /integrations, /notes, /settings
  const APP_PATHS = ['/overview', '/products', '/alerts', '/rules', '/integrations', '/notes', '/settings', '/billing']
  return APP_PATHS.some((path) =>
    locales.some((locale) => pathname.startsWith(`/${locale}${path}`)) || pathname.startsWith(path)
  )
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const { pathname } = request.nextUrl

  // Skip API and static routes
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return response
  }

  // Kök yönlendirme
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${defaultLocale}`, request.url))
  }

  // Supabase henüz yapılandırılmamışsa auth guard'ı atla
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? ''
  const supabaseKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''
  const supabaseConfigured = supabaseUrl.startsWith('https://') && supabaseUrl !== 'https://your-project.supabase.co' && supabaseKey.length > 10

  if (!supabaseConfigured) {
    return intlMiddleware(request)
  }

  // Refresh Supabase session
  const supabase = createMiddlewareClient(request, response)
  const { data: { session } } = await supabase.auth.getSession()

  // Auth guard: uygulama rotalarına giriş gerektir
  if (isAppRoute(pathname) && !session) {
    const locale = pathname.split('/')[1] ?? defaultLocale
    const loginUrl = new URL(`/${locale}/login`, request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Zaten giriş yapmış kullanıcıyı auth sayfalarından yönlendir
  if (isPublicAuthRoute(pathname) && session) {
    const locale = pathname.split('/')[1] ?? defaultLocale
    return NextResponse.redirect(new URL(`/${locale}/overview`, request.url))
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
