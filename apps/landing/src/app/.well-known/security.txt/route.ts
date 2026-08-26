import { NextResponse } from 'next/server'

export const dynamic = 'force-static'
export const revalidate = 86_400 // 1 day — cheap to regenerate, and Expires below should stay well within its own year-out window regardless.

/**
 * RFC 9116 security.txt — compliance audit rule 25. A route handler
 * (rather than a static public/ file) so Expires/Contact stay derived
 * from real config instead of a value someone forgets to bump; falls
 * back to the general support address if a dedicated security contact
 * isn't configured.
 */
export async function GET() {
  const landingUrl = process.env['NEXT_PUBLIC_LANDING_URL'] ?? 'https://stockalert.app'
  const contactEmail = process.env['NEXT_PUBLIC_SECURITY_CONTACT_EMAIL'] || process.env['NEXT_PUBLIC_SUPPORT_EMAIL']

  // RFC 9116 requires Expires within roughly a year of publication —
  // this recomputes "one year from now" on every request rather than a
  // hardcoded date that would silently go stale.
  const expires = new Date()
  expires.setFullYear(expires.getFullYear() + 1)

  const lines = [
    contactEmail ? `Contact: mailto:${contactEmail}` : null,
    `Expires: ${expires.toISOString()}`,
    'Preferred-Languages: en, tr',
    `Canonical: ${landingUrl}/.well-known/security.txt`,
    `Policy: ${landingUrl}/legal/terms`,
  ].filter((line): line is string => line !== null)

  return new NextResponse(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
