'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { useLocale } from 'next-intl'
import {
  Button, Input, Label,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@stockalert/ui'
import type { Locale } from '@stockalert/i18n'
import { deleteTeam, deleteAccount, exportMyData } from '../../actions/account'
import { logoutAction } from '../../actions/auth'

interface AccountDangerZoneProps {
  teamId: string
  teamName: string
  isOwner: boolean
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function AccountDangerZone({ teamId, teamName, isOwner }: AccountDangerZoneProps) {
  const locale = useLocale() as Locale
  const [exporting, setExporting] = React.useState(false)
  const [deleteTeamOpen, setDeleteTeamOpen] = React.useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = React.useState(false)
  const [teamConfirmText, setTeamConfirmText] = React.useState('')
  const [accountConfirmText, setAccountConfirmText] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  async function handleExport() {
    setExporting(true)
    const result = await exportMyData()
    setExporting(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    downloadJson(result.data, `stockalert-data-export-${new Date().toISOString().slice(0, 10)}.json`)
    toast.success('Data export downloaded')
  }

  async function handleDeleteTeam() {
    if (teamConfirmText !== teamName) return
    setBusy(true)
    const fd = new FormData()
    fd.set('teamId', teamId)
    fd.set('confirmName', teamConfirmText)
    const result = await deleteTeam(fd)
    setBusy(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success('Team deleted')
    window.location.href = `/${locale}/overview`
  }

  async function handleDeleteAccount() {
    if (accountConfirmText !== 'DELETE') return
    setBusy(true)
    const result = await deleteAccount()
    setBusy(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success('Account deleted')
    await logoutAction()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>
            Download everything StockAlert holds about you and your teams as JSON — products, alert
            rules, and notes across every team you belong to. Store credentials and API keys are never
            included.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => void handleExport()} disabled={exporting}>
            {exporting ? 'Preparing export…' : 'Export my data'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOwner && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Delete team &quot;{teamName}&quot;</p>
                <p className="text-sm text-muted-foreground">
                  Deletes every store, product, alert rule, and note for this team. Other members lose
                  access immediately.
                </p>
              </div>
              <Button variant="destructive" onClick={() => setDeleteTeamOpen(true)}>
                Delete team
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Delete your account</p>
              <p className="text-sm text-muted-foreground">
                {isOwner
                  ? 'Deletes every team you own (and all their data), removes you from any other teams, then deletes your account.'
                  : 'Removes you from all your teams, then deletes your account.'}
              </p>
            </div>
            <Button variant="destructive" onClick={() => setDeleteAccountOpen(true)}>
              Delete account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteTeamOpen} onOpenChange={(o) => { if (!o) { setDeleteTeamOpen(false); setTeamConfirmText('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete team</DialogTitle>
            <DialogDescription>
              This permanently deletes &quot;{teamName}&quot; and everything in it. Type the team name to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="team-confirm">Team name</Label>
            <Input
              id="team-confirm"
              value={teamConfirmText}
              onChange={(e) => setTeamConfirmText(e.target.value)}
              placeholder={teamName}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setDeleteTeamOpen(false); setTeamConfirmText('') }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={teamConfirmText !== teamName || busy}
              onClick={() => void handleDeleteTeam()}
            >
              {busy ? 'Deleting…' : 'Delete team permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAccountOpen} onOpenChange={(o) => { if (!o) { setDeleteAccountOpen(false); setAccountConfirmText('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This permanently deletes your account{isOwner ? ' and every team you own' : ''}. Type
              DELETE to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="account-confirm">Type DELETE</Label>
            <Input
              id="account-confirm"
              value={accountConfirmText}
              onChange={(e) => setAccountConfirmText(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setDeleteAccountOpen(false); setAccountConfirmText('') }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={accountConfirmText !== 'DELETE' || busy}
              onClick={() => void handleDeleteAccount()}
            >
              {busy ? 'Deleting…' : 'Delete account permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
