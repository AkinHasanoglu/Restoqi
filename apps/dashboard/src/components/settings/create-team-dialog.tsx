'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { toast } from 'sonner'
import {
  Button, Input, Label,
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@stockalert/ui'
import { createTeam } from '../../actions/team'
import { Plus } from 'lucide-react'

export function CreateTeamDialog() {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [name, setName] = React.useState('')
  const router = useRouter()
  const locale = useLocale()

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData()
    fd.set('name', name)
    fd.set('slug', slug)
    const result = await createTeam(fd)
    setLoading(false)
    if (result.success) {
      toast.success('Team created!')
      setOpen(false)
      setName('')
      router.push(`/${locale}/overview`)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
          <Plus className="h-4 w-4" />
          Create new team
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new team</DialogTitle>
          <DialogDescription>
            Teams allow you to collaborate with others and manage multiple stores.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="team-name">Team name</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc."
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input value={slug} readOnly className="text-muted-foreground" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !name}>
              {loading ? 'Creating…' : 'Create team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
