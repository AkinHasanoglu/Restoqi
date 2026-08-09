'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@stockalert/ui'
import { inviteMember } from '../../actions/team'

export function InviteMemberForm({ teamId }: { teamId: string }) {
  const [loading, setLoading] = React.useState(false)
  const [role, setRole] = React.useState('editor')
  const ref = React.useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    fd.set('teamId', teamId)
    fd.set('role', role)
    const result = await inviteMember(fd)
    setLoading(false)
    if (result.success) {
      toast.success('Invitation sent!')
      ref.current?.reset()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <form ref={ref} onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="invite-email">Email address</Label>
        <Input id="invite-email" name="email" type="email" placeholder="colleague@example.com" required />
      </div>
      <div className="w-36 space-y-1.5">
        <Label>Role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Sending…' : 'Send invite'}
      </Button>
    </form>
  )
}
