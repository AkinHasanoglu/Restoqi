import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@stockalert/database/server'
import { loadApiKey } from '@stockalert/database/api-keys'
import { predictInventory, type ApiKeys } from '@stockalert/ai'
import { isAuthorizedWorkerRequest } from '../../../../lib/worker-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Db = ReturnType<typeof createServiceRoleClient>

// String confidence from packages/ai maps onto ai_predictions.confidence's
// `numeric check (confidence between 0 and 1)` — chosen as representative
// midpoints of low/medium/high bands rather than a finer scale the
// providers don't actually produce.
const CONFIDENCE_SCORE: Record<'low' | 'medium' | 'high', number> = { low: 0.3, medium: 0.6, high: 0.9 }

interface TrackedProduct {
  id: string
  team_id: string
  title: string | null
  current_quantity: number | null
}

async function fetchApiKeys(teamId: string, db: Db): Promise<ApiKeys> {
  const [anthropic, openai] = await Promise.all([
    loadApiKey(db, teamId, 'anthropic').catch(() => null),
    loadApiKey(db, teamId, 'openai').catch(() => null),
  ])
  return {
    ...(anthropic ? { anthropic } : {}),
    ...(openai ? { openai } : {}),
  }
}

async function predictForProduct(product: TrackedProduct, apiKeys: ApiKeys, db: Db): Promise<void> {
  // Skip if a still-valid prediction already exists — recomputing (an LLM
  // call, when a team has BYOK configured) on every cron tick regardless
  // of freshness would just burn the team's API quota for no new signal.
  const { data: existing } = await db
    .from('ai_predictions')
    .select('id')
    .eq('product_id', product.id)
    .gt('valid_until', new Date().toISOString())
    .order('predicted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existing) return

  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data: history } = await db
    .from('inventory_snapshots')
    .select('quantity, recorded_at')
    .eq('product_id', product.id)
    .gte('recorded_at', since30)
    .order('recorded_at', { ascending: true })

  if (!history || history.length < 2) return

  const snapshots = history.map((h) => ({ date: h.recorded_at, quantity: h.quantity }))
  const currentQuantity = product.current_quantity ?? snapshots[snapshots.length - 1]!.quantity

  const result = await predictInventory(apiKeys, product.title ?? 'Untitled product', snapshots, currentQuantity)

  const metadata = 'avgDailySales' in result ? { avgDailySales: result.avgDailySales } : { reasoning: result.reasoning }

  const { error } = await db.from('ai_predictions').insert({
    product_id: product.id,
    team_id: product.team_id,
    provider: result.provider,
    days_until_stockout: result.daysUntilStockout,
    confidence: CONFIDENCE_SCORE[result.confidence],
    metadata,
  })
  if (error) console.error('[predict] ai_predictions insert failed', { productId: product.id, error })
}

/** Daily cron (see vercel.json) — computes a stockout prediction for every actively tracked product. */
export async function GET(request: NextRequest) {
  if (!(await isAuthorizedWorkerRequest(request, ''))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceRoleClient()
  const { data: products } = await db
    .from('products')
    .select('id, team_id, title, current_quantity')
    .eq('is_tracked', true)

  const byTeam = new Map<string, TrackedProduct[]>()
  for (const p of products ?? []) {
    const list = byTeam.get(p.team_id) ?? []
    list.push(p)
    byTeam.set(p.team_id, list)
  }

  let total = 0
  let failed = 0

  for (const [teamId, teamProducts] of byTeam) {
    const apiKeys = await fetchApiKeys(teamId, db)
    const results = await Promise.allSettled(teamProducts.map((p) => predictForProduct(p, apiKeys, db)))
    total += results.length
    failed += results.filter((r) => r.status === 'rejected').length
  }

  return NextResponse.json({ total, failed })
}
