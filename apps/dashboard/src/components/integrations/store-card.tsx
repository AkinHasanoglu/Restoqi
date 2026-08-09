'use client'

import { useTransition } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Trash2 } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@stockalert/ui'
import { toast } from '@stockalert/ui'
import { disconnectStore, triggerManualSync } from '../../actions/integrations'

const PLATFORM_LABELS: Record<string, string> = {
  shopify: 'Shopify',
  trendyol: 'Trendyol',
  amazon: 'Amazon',
  etsy: 'Etsy',
  ebay: 'eBay',
  hepsiburada: 'Hepsiburada',
  aliexpress: 'AliExpress',
}

const PLATFORM_COLORS: Record<string, { color: string; bg: string }> = {
  shopify:     { color: '#96BF48', bg: '#96BF4818' },
  trendyol:    { color: '#F27A1A', bg: '#F27A1A18' },
  amazon:      { color: '#FF9900', bg: '#FF990018' },
  etsy:        { color: '#F56400', bg: '#F5640018' },
  ebay:        { color: '#E53238', bg: '#E5323818' },
  hepsiburada: { color: '#FF6000', bg: '#FF600018' },
  aliexpress:  { color: '#FF4747', bg: '#FF474718' },
}

type StoreRow = {
  id: string
  platform: string
  store_name: string
  status: string
  created_at: string
  product_count: number
}

export function StoreCard({ store }: { store: StoreRow }) {
  const [isSyncing, startSync] = useTransition()
  const [isDisconnecting, startDisconnect] = useTransition()

  function handleSync() {
    startSync(async () => {
      const result = await triggerManualSync(store.id)
      if (result.error) toast.error(result.error)
      else toast.success('Senkronizasyon başlatıldı!')
    })
  }

  function handleDisconnect() {
    if (!confirm(`"${store.store_name}" bağlantısını kesmek istiyor musunuz? Stok senkronizasyonu duracak.`)) return
    startDisconnect(async () => {
      const fd = new FormData()
      fd.set('storeId', store.id)
      const result = await disconnectStore(fd)
      if (result.error) toast.error(result.error)
      else toast.success('Mağaza bağlantısı kesildi')
    })
  }

  const isActive = store.status === 'active'
  const platformColors = PLATFORM_COLORS[store.platform] ?? { color: '#6b7280', bg: '#6b728018' }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            {/* Platform avatar */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
              style={{ backgroundColor: platformColors.bg, color: platformColors.color }}
            >
              {(PLATFORM_LABELS[store.platform] ?? store.platform)[0]?.toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <CardTitle className="text-base">{store.store_name}</CardTitle>
              <CardDescription className="mt-0.5">
                {PLATFORM_LABELS[store.platform] ?? store.platform}
              </CardDescription>
            </div>

            {/* Animated status dot */}
            <div className="flex items-center gap-1.5 pt-1">
              <span
                className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-muted-foreground'}`}
                style={isActive ? { animation: 'status-pulse 2s ease-in-out infinite' } : undefined}
              />
              <span className={`text-xs font-medium ${isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
                {isActive ? 'Aktif' : store.status}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{String(store.product_count)}</span>{' '}
            {store.product_count !== 1 ? 'ürün' : 'ürün'} takip ediliyor
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing || !isActive}
              className="gap-1.5 border-border/60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Senkronize Et
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Kaldır
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
