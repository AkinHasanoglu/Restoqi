import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@stockalert/database/server'
import { ProductsTable } from '../../../../components/products/products-table'
import { EmptyState } from '@stockalert/ui'
import { PackageSearch } from 'lucide-react'

export const metadata: Metadata = { title: 'Products' }

export default async function ProductsPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .order('joined_at')
    .limit(1)
    .single()

  const teamId = membership?.team_id

  const [{ data: products }, { data: predictions }] = teamId
    ? await Promise.all([
        supabase
          .from('products')
          .select('id, external_id, title, sku, barcode, image_url, product_url, platform, current_quantity, last_synced_at, store_id, connected_stores(platform, store_name)')
          .eq('team_id', teamId)
          .order('title'),
        // Only still-valid predictions — a stale row (worker hasn't run
        // since valid_until lapsed) shouldn't be shown as current.
        supabase
          .from('ai_predictions')
          .select('product_id, days_until_stockout, predicted_at')
          .eq('team_id', teamId)
          .gt('valid_until', new Date().toISOString())
          .order('predicted_at', { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }]

  // ai_predictions has one row per prediction run, not per product — keep
  // only the most recent (first, since ordered desc) per product_id.
  const latestDaysUntilStockout = new Map<string, number | null>()
  for (const pred of predictions ?? []) {
    if (!latestDaysUntilStockout.has(pred.product_id)) {
      latestDaysUntilStockout.set(pred.product_id, pred.days_until_stockout)
    }
  }

  const rows = (products ?? []).map((p) => ({
    id: p.id,
    externalId: p.external_id,
    title: p.title ?? '(untitled)',
    sku: p.sku ?? null,
    barcode: p.barcode ?? null,
    imageUrl: p.image_url ?? null,
    productUrl: p.product_url ?? null,
    platform: p.platform ?? 'unknown',
    quantity: p.current_quantity ?? null,
    lastSyncedAt: p.last_synced_at ?? null,
    storeName: (p.connected_stores as { store_name: string } | null)?.store_name ?? p.platform ?? 'unknown',
    daysUntilStockout: latestDaysUntilStockout.get(p.id) ?? null,
  }))

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Products</h1>
        <EmptyState
          icon={<PackageSearch className="h-10 w-10 text-muted-foreground" />}
          title="No products yet"
          description="Connect a store in the Integrations page to start tracking your inventory."
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Products</h1>
      <p className="text-muted-foreground">{String(rows.length)} product{rows.length !== 1 ? 's' : ''} tracked</p>
      <ProductsTable products={rows} />
    </div>
  )
}
