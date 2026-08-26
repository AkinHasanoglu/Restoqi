'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@stockalert/ui'
import { saveApiKeyAction, deleteApiKeyAction } from '../../actions/api-keys'

export interface ApiKeySummaryRow {
  provider: 'anthropic' | 'openai'
  last4: string
  updatedAt: string
}

const PROVIDER_LABELS: Record<ApiKeySummaryRow['provider'], string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI (GPT)',
}

function ProviderRow({
  teamId,
  provider,
  existing,
}: {
  teamId: string
  provider: ApiKeySummaryRow['provider']
  existing: ApiKeySummaryRow | undefined
}) {
  const [value, setValue] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  async function handleSave() {
    if (!value.trim()) return
    setLoading(true)
    const fd = new FormData()
    fd.set('teamId', teamId)
    fd.set('provider', provider)
    fd.set('apiKey', value.trim())
    const result = await saveApiKeyAction(fd)
    setLoading(false)
    if (result.success) {
      toast.success(`${PROVIDER_LABELS[provider]} key saved`)
      setValue('')
    } else {
      toast.error(result.error)
    }
  }

  async function handleDelete() {
    setLoading(true)
    const fd = new FormData()
    fd.set('teamId', teamId)
    fd.set('provider', provider)
    const result = await deleteApiKeyAction(fd)
    setLoading(false)
    if (result.success) {
      toast.success(`${PROVIDER_LABELS[provider]} key removed`)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-2 border-b pb-4 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between">
        <Label>{PROVIDER_LABELS[provider]}</Label>
        {existing && (
          <span className="text-xs text-muted-foreground">
            •••• {existing.last4} · updated {new Date(existing.updatedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          type="password"
          placeholder={existing ? 'Enter a new key to replace it' : `${provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button onClick={handleSave} disabled={loading || !value.trim()}>
          {existing ? 'Replace' : 'Save'}
        </Button>
        {existing && (
          <Button variant="outline" onClick={handleDelete} disabled={loading}>
            Remove
          </Button>
        )}
      </div>
    </div>
  )
}

export function ApiKeysForm({ teamId, existingKeys }: { teamId: string; existingKeys: ApiKeySummaryRow[] }) {
  const byProvider = new Map(existingKeys.map((k) => [k.provider, k]))

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI provider keys</CardTitle>
        <CardDescription>
          Bring your own Anthropic or OpenAI key to power stockout predictions with your own quota, instead of
          StockAlert&apos;s shared statistical fallback. Keys are encrypted at rest and never shown in full again.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProviderRow teamId={teamId} provider="anthropic" existing={byProvider.get('anthropic')} />
        <ProviderRow teamId={teamId} provider="openai" existing={byProvider.get('openai')} />
      </CardContent>
    </Card>
  )
}
