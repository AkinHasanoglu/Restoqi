import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

let ratelimit: Ratelimit | null = null

function getRatelimit() {
  if (ratelimit) return ratelimit
  const url = process.env['UPSTASH_REDIS_REST_URL']
  const token = process.env['UPSTASH_REDIS_REST_TOKEN']
  if (!url || !token) return null
  const redis = new Redis({ url, token })
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    prefix: 'rl:api',
  })
  return ratelimit
}

export async function rateLimit(request: NextRequest): Promise<NextResponse | null> {
  const rl = getRatelimit()
  if (!rl) return null

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous'
  const { success } = await rl.limit(ip)

  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  return null
}
