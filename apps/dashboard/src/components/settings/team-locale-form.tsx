'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@stockalert/ui'
import { locales, localeNames, localeFlags, type Locale } from '@stockalert/i18n'
import { updateTeamLocale } from '../../actions/team'

interface TeamLocaleFormProps {
  teamId: string
  currentLocale: Locale
}

export function TeamLocaleForm({ teamId, currentLocale }: TeamLocaleFormProps) {
  const [locale, setLocale] = React.useState<Locale>(currentLocale)
  const [loading, setLoading] = React.useState(false)

  async function handleSave() {
    setLoading(true)
    const fd = new FormData()
    fd.set('teamId', teamId)
    fd.set('locale', locale)
    const result = await updateTeamLocale(fd)
    setLoading(false)
    if (result.success) {
      toast.success('Notification language updated')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="w-56 space-y-1.5">
        <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {locales.map((l) => (
              <SelectItem key={l} value={l}>
                {localeFlags[l]} {localeNames[l]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleSave} disabled={loading || locale === currentLocale}>
        {loading ? 'Saving…' : 'Save'}
      </Button>
    </div>
  )
}
