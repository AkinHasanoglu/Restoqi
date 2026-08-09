'use client'

import * as React from 'react'
import { useTransition } from 'react'
import { Plus, Bell, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  Button, Badge, Card, CardContent, CardHeader, CardTitle, CardDescription,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Switch, EmptyState,
} from '@stockalert/ui'
import { toast } from '@stockalert/ui'
import { createAlertRule, deleteAlertRule, toggleAlertRule } from '../../actions/alerts'

type Store = { id: string; store_name: string; platform: string }
type Channel = { id: string; name: string; type: string }
type Rule = {
  id: string
  name: string
  threshold_type: string
  threshold_value: number
  channels: string[]
  all_products: boolean
  enabled: boolean
  created_at: string
}

const THRESHOLD_LABELS = {
  absolute: 'Units below',
  percentage: 'Percentage below',
  days_of_supply: 'Days of supply below',
}

const CHANNEL_LABELS = {
  email: 'Email',
  slack: 'Slack',
  telegram: 'Telegram',
  sms: 'SMS',
  webhook: 'Webhook',
  n8n: 'n8n',
}

interface AlertRulesClientProps {
  rules: Rule[]
  stores: Store[]
  channels: Channel[]
  canEdit: boolean
}

export function AlertRulesClient({ rules, stores: _stores, channels, canEdit }: AlertRulesClientProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = React.useState('')
  const [thresholdType, setThresholdType] = React.useState<'absolute' | 'percentage' | 'days_of_supply'>('absolute')
  const [thresholdValue, setThresholdValue] = React.useState('10')
  const [selectedChannelTypes, setSelectedChannelTypes] = React.useState<string[]>(['email'])
  const [selectedChannelIds, setSelectedChannelIds] = React.useState<string[]>([])
  const [throttleMinutes, setThrottleMinutes] = React.useState('60')

  function resetForm() {
    setName('')
    setThresholdType('absolute')
    setThresholdValue('10')
    setSelectedChannelTypes(['email'])
    setSelectedChannelIds([])
    setThrottleMinutes('60')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('name', name)
    fd.set('thresholdType', thresholdType)
    fd.set('thresholdValue', thresholdValue)
    fd.set('channels', JSON.stringify(selectedChannelTypes))
    fd.set('allProducts', 'true')
    fd.set('storeIds', '[]')
    fd.set('productIds', '[]')
    fd.set('tags', '[]')
    fd.set('silenceWindowMinutes', '0')
    fd.set('throttleMinutes', throttleMinutes)
    fd.set('notificationChannelIds', JSON.stringify(selectedChannelIds))
    fd.set('enabled', 'true')

    startTransition(async () => {
      const result = await createAlertRule(fd)
      if (result.error) toast.error(result.error)
      else {
        toast.success('Alert rule created!')
        resetForm()
        setDialogOpen(false)
      }
    })
  }

  function handleToggle(ruleId: string, enabled: boolean) {
    startTransition(async () => {
      await toggleAlertRule(ruleId, !enabled)
    })
  }

  function handleDelete(ruleId: string) {
    if (!confirm('Delete this alert rule?')) return
    startTransition(async () => {
      const result = await deleteAlertRule(ruleId)
      if (result.error) toast.error(result.error)
      else toast.success('Rule deleted')
    })
  }

  function toggleChannelType(ch: string) {
    setSelectedChannelTypes((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alert Rules</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Get notified when stock drops below your thresholds.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New rule
          </Button>
        )}
      </div>

      {rules.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-10 w-10 text-muted-foreground" />}
          title="No alert rules"
          description="Create a rule to get notified when stock drops below your threshold."
          action={
            canEdit ? (
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Create first rule
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{rule.name}</CardTitle>
                    <CardDescription>
                      {THRESHOLD_LABELS[rule.threshold_type as keyof typeof THRESHOLD_LABELS] ?? rule.threshold_type}: {String(rule.threshold_value)}
                    </CardDescription>
                  </div>
                  <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                    {rule.enabled ? 'Active' : 'Paused'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {rule.channels.map((ch) => (
                    <Badge key={ch} variant="outline" className="text-xs">
                      {CHANNEL_LABELS[ch as keyof typeof CHANNEL_LABELS] ?? ch}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {rule.all_products ? 'All products' : 'Selected products'}
                </p>
                {canEdit && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(rule.id, rule.enabled)}
                      disabled={isPending}
                      className="gap-1"
                    >
                      {rule.enabled
                        ? <><ToggleLeft className="h-4 w-4" /> Pause</>
                        : <><ToggleRight className="h-4 w-4" /> Enable</>
                      }
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rule.id)}
                      disabled={isPending}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { resetForm(); setDialogOpen(false) } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New alert rule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Rule name</Label>
              <Input
                id="rule-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Low stock alert"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Threshold type</Label>
                <Select value={thresholdType} onValueChange={(v) => setThresholdType(v as typeof thresholdType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="absolute">Units below</SelectItem>
                    <SelectItem value="days_of_supply">Days of supply</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="threshold-value">Threshold value</Label>
                <Input
                  id="threshold-value"
                  type="number"
                  min="1"
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notification channels</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CHANNEL_LABELS) as Array<keyof typeof CHANNEL_LABELS>).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => toggleChannelType(ch)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      selectedChannelTypes.includes(ch)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    {CHANNEL_LABELS[ch]}
                  </button>
                ))}
              </div>
            </div>

            {channels.length > 0 && (
              <div className="space-y-2">
                <Label>Linked notification channels</Label>
                <div className="space-y-1">
                  {channels.map((ch) => (
                    <label key={ch.id} className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={selectedChannelIds.includes(ch.id)}
                        onCheckedChange={(v) =>
                          setSelectedChannelIds((prev) =>
                            v ? [...prev, ch.id] : prev.filter((id) => id !== ch.id)
                          )
                        }
                      />
                      {ch.name} <span className="text-xs text-muted-foreground">({ch.type})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="throttle">Re-alert after (minutes)</Label>
              <Input
                id="throttle"
                type="number"
                min="0"
                value={throttleMinutes}
                onChange={(e) => setThrottleMinutes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => { resetForm(); setDialogOpen(false) }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || selectedChannelTypes.length === 0}>
                {isPending ? 'Creating…' : 'Create rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
