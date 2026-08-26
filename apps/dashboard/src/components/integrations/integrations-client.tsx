'use client'

import * as React from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Plus, Plug } from 'lucide-react'
import { Button, EmptyState } from '@stockalert/ui'
import { toast } from '@stockalert/ui'
import { ConnectStoreDialog } from './connect-store-dialog'
import { StoreCard } from './store-card'

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  subscription_required: 'An active subscription is required to connect stores.',
  plan_limit_reached: 'Store limit reached for your plan. Upgrade to connect more.',
  no_team: 'No team found. Please create or join a team first.',
  invalid_request: 'Invalid request. Please try connecting again.',
}

type StoreRow = {
  id: string
  platform: string
  store_name: string
  is_active: boolean
  sync_error: string | null
  created_at: string
  product_count: number
}

interface IntegrationsClientProps {
  stores: StoreRow[]
  canManage: boolean
}

export function IntegrationsClient({ stores, canManage }: IntegrationsClientProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected === '1') {
      toast.success('Store connected successfully!')
    } else if (error) {
      const message = OAUTH_ERROR_MESSAGES[error] ?? `Connection failed: ${error}`
      toast.error(message)
    }

    if (connected || error) {
      router.replace(pathname)
    }
  }, [searchParams, router, pathname])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your marketplaces to track inventory across all channels.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2 shadow-md shadow-primary/15">
            <Plus className="h-4 w-4" />
            Mağaza Bağla
          </Button>
        )}
      </div>

      {stores.length === 0 ? (
        <EmptyState
          icon={<Plug className="h-10 w-10 text-muted-foreground" />}
          title="No stores connected"
          description="Connect a marketplace to start tracking inventory and receive stock alerts."
          action={
            canManage ? (
              <Button onClick={() => setDialogOpen(true)} className="gap-2 shadow-md shadow-primary/15">
                <Plus className="h-4 w-4" />
                İlk mağazanızı bağlayın
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      )}

      <ConnectStoreDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  )
}
