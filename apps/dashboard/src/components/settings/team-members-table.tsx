'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  Card, CardContent, CardHeader, CardTitle,
  Badge, Button,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@stockalert/ui'
import { changeRole, removeMember } from '../../actions/team'

type Role = 'owner' | 'admin' | 'editor' | 'viewer'

interface Member {
  id: string
  user_id: string
  role: string
  joined_at: string
}

interface PendingInvite {
  id: string
  email: string
  role: string
  expires_at: string
  created_at: string
}

interface TeamMembersTableProps {
  members: Member[]
  currentUserId: string
  currentUserRole: Role
  teamId: string
  pendingInvites: PendingInvite[]
}

const ROLE_COLORS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  owner: 'default',
  admin: 'secondary',
  editor: 'outline',
  viewer: 'outline',
}

export function TeamMembersTable({
  members,
  currentUserId,
  currentUserRole,
  teamId,
  pendingInvites,
}: TeamMembersTableProps) {
  const [removingId, setRemovingId] = React.useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = React.useState<Member | null>(null)
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'

  async function handleRoleChange(memberId: string, newRole: string) {
    const fd = new FormData()
    fd.set('teamId', teamId)
    fd.set('memberId', memberId)
    fd.set('role', newRole)
    const result = await changeRole(fd)
    if (result.success) {
      toast.success('Role updated')
    } else {
      toast.error(result.error)
    }
  }

  async function handleRemove(member: Member) {
    setRemovingId(member.id)
    const fd = new FormData()
    fd.set('teamId', teamId)
    fd.set('memberId', member.id)
    const result = await removeMember(fd)
    setRemovingId(null)
    setConfirmRemove(null)
    if (result.success) {
      toast.success('Member removed')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {members.map((m) => {
            const isSelf = m.user_id === currentUserId
            const isOwner = m.role === 'owner'
            const canEdit = canManage && !isOwner && !isSelf
            return (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
                    {m.user_id.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{isSelf ? 'You' : m.user_id.slice(0, 8) + '...'}</p>
                    <p className="text-xs text-muted-foreground">Joined {new Date(m.joined_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit ? (
                    <Select defaultValue={m.role} onValueChange={(v) => handleRoleChange(m.id, v)}>
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={ROLE_COLORS[m.role] ?? 'outline'} className="capitalize">
                      {m.role}
                    </Badge>
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmRemove(m)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations ({pendingInvites.length})</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">{inv.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              This will remove the member from the team. They will lose access to all team resources.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!!removingId}
              onClick={() => confirmRemove && handleRemove(confirmRemove)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
