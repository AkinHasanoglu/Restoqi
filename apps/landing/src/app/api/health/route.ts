import { NextResponse, type NextRequest } from 'next/server'
import { timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const START_TIME = Date.now()

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length || bufA.length === 0) return false
  return timingSafeEqual(bufA, bufB)
}

function isAuthorized(request: NextRequest): boolean {
  const apiKey = process.env['HUB_API_KEY']
  if (!apiKey) return false
  const header = request.headers.get('authorization') ?? ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) return false
  return safeEqual(token, apiKey)
}

export function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    app: process.env['APP_NAME'] ?? 'stockalert-landing',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    metrics: { db: 'n/a' },
  })
}
