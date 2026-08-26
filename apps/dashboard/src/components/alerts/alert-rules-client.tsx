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
type Channel = { id: string; name: string; channel_type: string }
type Rule = {
  id: string
  name: string
  threshold_type: string
  threshold_value: number
  channel_ids: string[]
  scope_product_ids: string[] | null
  scope_store_ids: string[] | null
  scope_tags: string[] | null
  is_active: boolean
  created_at: string
}

const THRESHOLD_LABELS = {
  absolute: 'Units below',
  percentage: 'Percentage below',
  days_of_supply: 'Days of supply below',
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
  const [selectedChannelIds, setSelectedChannelIds] = React.useState<string[]>([])
  const [cooldownMinutes, setCooldownMinutes] = React.useState('240')

  function resetForm() {
    setName('')
    setThresholdType('absolute')
    setThresholdValue('10')
    setSelectedChannelIds([])
    setCooldownMinutes('240')
  }

  function channelNames(channelIds: string[]) {
    return channelIds
      .map((id) => channels.find((c) => c.id === id)?.name)
      .filter((name): name is string => Boolean(name))
  }

  function isAllProducts(rule: Rule) {
    return !rule.scope_product_ids?.length && !rule.scope_store_ids?.length && !rule.scope_tags?.length
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedChannelIds.length === 0) {
      toast.error('Select at least one notification channel')
      return
    }

    const fd = new FormData()
    fd.set('name', name)
    fd.set('thresholdType', thresholdType)
    fd.set('thresholdValue', thresholdValue)
    fd.set('channelIds', JSON.stringify(selectedChannelIds))
    fd.set('storeIds', '[]')
    fd.set('productIds', '[]')
    fd.set('tags', '[]')
    fd.set('silenceWindowMinutes', '0')
    fd.set('cooldownMinutes', cooldownMinutes)
    fd.set('isActive', 'true')

    startTransition(async () => {
      const result = await createAlertRule(fd)
      if (!result.success) toast.error(result.error)
      else {
        toast.success('Alert rule created!')
        resetForm()
        setDialogOpen(false)
      }
    })
  }

  function handleToggle(ruleId: string, isActive: boolean) {
    startTransition(async () => {
      const result = await toggleAlertRule(ruleId, !isActive)
      if (!result.success) toast.error(result.error)
    })
  }

  function handleDelete(ruleId: string) {
    if (!confirm('Delete this alert rule?')) return
    startTransition(async () => {
      const result = await deleteAlertRule(ruleId)
      if (!result.success) toast.error(result.error)
      else toast.success('Rule deleted')
    })
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
                  <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                    {rule.is_active ? 'Active' : 'Paused'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {channelNames(rule.channel_ids).map((name) => (
                    <Badge key={name} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isAllProducts(rule) ? 'All products' : 'Selected products'}
                </p>
                {canEdit && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(rule.id, rule.is_active)}
                      disabled={isPending}
                      className="gap-1"
                    >
                      {rule.is_active
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
              {channels.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No notification channels configured yet — create one first.
                </p>
              ) : (
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
                      {ch.name} <span className="text-xs text-muted-foreground">({ch.channel_type})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cooldown">Re-alert after (minutes)</Label>
              <Input
                id="cooldown"
                type="number"
                min="0"
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => { resetForm(); setDialogOpen(false) }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || selectedChannelIds.length === 0}>
                {isPending ? 'Creating…' : 'Create rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
