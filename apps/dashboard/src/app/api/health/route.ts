import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createServiceRoleClient } from '@stockalert/database/server'
import { isSupabaseConfigured } from '@stockalert/database/client'

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

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let db: 'connected' | 'error' | 'not_configured' = 'not_configured'
  let dbLatencyMs: number | undefined

  if (isSupabaseConfigured) {
    const start = Date.now()
    try {
      const supabase = createServiceRoleClient()
      const { error } = await supabase.from('teams').select('id', { count: 'exact', head: true }).limit(1)
      dbLatencyMs = Date.now() - start
      db = error ? 'error' : 'connected'
    } catch {
      dbLatencyMs = Date.now() - start
      db = 'error'
    }
  }

  const status = db === 'error' ? 'degraded' : 'healthy'

  return NextResponse.json({
    app: process.env['APP_NAME'] ?? 'stockalert-dashboard',
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    metrics: { db, ...(dbLatencyMs !== undefined ? { dbLatencyMs } : {}) },
  })
}
