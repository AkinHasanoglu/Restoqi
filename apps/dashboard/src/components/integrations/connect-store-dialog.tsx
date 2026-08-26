'use client'

import * as React from 'react'
import { useTransition } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Button, Input, Label,
} from '@stockalert/ui'
import { toast } from '@stockalert/ui'
import { connectApiKeyStore } from '../../actions/integrations'

type Platform = {
  id: string
  name: string
  authType: 'apiKey' | 'oauth'
  fields: Array<{ key: string; label: string; placeholder?: string; type?: string }>
}

const PLATFORMS: Platform[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    authType: 'oauth',
    fields: [{ key: 'shopDomain', label: 'Shop Domain', placeholder: 'mystore.myshopify.com' }],
  },
  {
    id: 'trendyol',
    name: 'Trendyol',
    authType: 'apiKey',
    fields: [
      { key: 'supplierId', label: 'Supplier ID' },
      { key: 'apiKey', label: 'API Key' },
      { key: 'apiSecret', label: 'API Secret', type: 'password' },
    ],
  },
  {
    id: 'amazon',
    name: 'Amazon',
    authType: 'apiKey',
    fields: [
      { key: 'sellerId', label: 'Seller ID' },
      { key: 'marketplaceId', label: 'Marketplace ID', placeholder: 'e.g. A1F83G8C2ARO7P' },
      { key: 'refreshToken', label: 'LWA Refresh Token', type: 'password' },
    ],
  },
  {
    id: 'etsy',
    name: 'Etsy',
    authType: 'oauth',
    fields: [],
  },
  {
    id: 'ebay',
    name: 'eBay',
    authType: 'oauth',
    fields: [],
  },
  {
    id: 'hepsiburada',
    name: 'Hepsiburada',
    authType: 'apiKey',
    fields: [
      { key: 'merchantId', label: 'Merchant ID' },
      { key: 'apiKey', label: 'API Key', type: 'password' },
    ],
  },
  {
    id: 'aliexpress',
    name: 'AliExpress',
    authType: 'oauth',
    fields: [],
  },
]

interface ConnectStoreDialogProps {
  open: boolean
  onClose: () => void
}

export function ConnectStoreDialog({ open, onClose }: ConnectStoreDialogProps) {
  const [selectedPlatform, setSelectedPlatform] = React.useState<Platform | null>(null)
  const [storeName, setStoreName] = React.useState('')
  const [fieldValues, setFieldValues] = React.useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    setSelectedPlatform(null)
    setStoreName('')
    setFieldValues({})
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPlatform) return

    if (selectedPlatform.authType === 'oauth') {
      const connector = selectedPlatform.id
      const redirectUri = `${window.location.origin}/api/auth/oauth-callback?platform=${connector}`

      // No client-generated `state` anymore — oauth-start generates it
      // server-side and binds it to an httpOnly cookie, which
      // oauth-callback verifies. A client-supplied state would be
      // meaningless as a CSRF defense (the browser making the callback
      // request is exactly what an attacker controls).
      const params = new URLSearchParams({
        platform: connector,
        redirectUri,
      })
      const shopDomain = fieldValues['shopDomain'] ?? ''
      if (shopDomain) params.set('shopDomain', shopDomain)

      window.location.href = `/api/integrations/oauth-start?${params.toString()}`
      return
    }

    const formData = new FormData()
    formData.set('platform', selectedPlatform.id)
    formData.set('storeName', storeName)
    formData.set('credentials', JSON.stringify(fieldValues))

    startTransition(async () => {
      const result = await connectApiKeyStore(formData)
      if (!result.success) {
        toast.error(result.error)
      } else {
        toast.success('Store connected!')
        handleClose()
      }
    })
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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mağaza Bağla</DialogTitle>
          <DialogDescription>
            {selectedPlatform
              ? `${selectedPlatform.name} bilgilerinizi girin`
              : 'Bağlamak istediğiniz platformu seçin'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 pb-1">
          <div className="h-1 flex-1 rounded-full bg-primary transition-colors" />
          <div className={`h-1 flex-1 rounded-full transition-colors ${selectedPlatform ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {!selectedPlatform ? (
          <div className="grid grid-cols-2 gap-2.5 py-2">
            {PLATFORMS.map((p) => {
              const colors = PLATFORM_COLORS[p.id] ?? { color: '#6b7280', bg: '#6b728018' }
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlatform(p)}
                  className="flex items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-all hover:shadow-sm"
                  style={{ borderColor: `${colors.color}40`, backgroundColor: colors.bg }}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                    style={{ backgroundColor: `${colors.color}25`, color: colors.color }}
                  >
                    {p.name[0]}
                  </div>
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{p.authType === 'oauth' ? 'OAuth' : 'API Key'}</p>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="storeName">Mağaza adı</Label>
              <Input
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Benim Mağazam"
                required
              />
            </div>

            {selectedPlatform.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type ?? 'text'}
                  placeholder={field.placeholder}
                  value={fieldValues[field.key] ?? ''}
                  onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  required
                />
              </div>
            ))}

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => setSelectedPlatform(null)}>
                Geri
              </Button>
              <Button type="submit" disabled={isPending} className="shadow-sm shadow-primary/20">
                {isPending ? 'Bağlanıyor…' : selectedPlatform.authType === 'oauth' ? 'OAuth ile Devam Et' : 'Bağlan'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
