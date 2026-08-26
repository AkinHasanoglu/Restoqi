'use client'

import * as React from 'react'
import { useTransition } from 'react'
import { Plus, Pencil, Trash2, StickyNote } from 'lucide-react'
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Input, Label, EmptyState,
} from '@stockalert/ui'
import { toast } from '@stockalert/ui'
import { createNote, updateNote, deleteNote } from '../../actions/notes'

type Note = {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

interface NotesClientProps {
  notes: Note[]
  teamId: string
  canEdit: boolean
}

export function NotesClient({ notes, canEdit }: NotesClientProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Note | null>(null)
  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [isPending, startTransition] = useTransition()

  function openCreate() {
    setEditing(null)
    setTitle('')
    setContent('')
    setDialogOpen(true)
  }

  function openEdit(note: Note) {
    setEditing(note)
    setTitle(note.title)
    setContent(note.content)
    setDialogOpen(true)
  }

  function handleClose() {
    setDialogOpen(false)
    setEditing(null)
    setTitle('')
    setContent('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('title', title)
    fd.set('content', content)

    startTransition(async () => {
      const result = editing
        ? await updateNote(editing.id, fd)
        : await createNote(fd)
      if (!result.success) toast.error(result.error)
      else {
        toast.success(editing ? 'Note updated' : 'Note created')
        handleClose()
      }
    })
  }

  function handleDelete(noteId: string) {
    if (!confirm('Delete this note?')) return
    startTransition(async () => {
      const result = await deleteNote(noteId)
      if (!result.success) toast.error(result.error)
      else toast.success('Note deleted')
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Team notes and strategy documentation.</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New note
          </Button>
        )}
      </div>

      {notes.length === 0 ? (
        <EmptyState
          icon={<StickyNote className="h-10 w-10 text-muted-foreground" />}
          title="No notes yet"
          description="Create notes for team context, strategies, and supplier contacts."
          action={canEdit ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Create first note
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <Card key={note.id} className="group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{note.title}</CardTitle>
                  {canEdit && (
                    // group-focus-within (not just group-hover) so a
                    // keyboard user tabbing onto either button actually
                    // sees it appear, rather than it staying invisible
                    // until a mouse hovers the card — WCAG 2.1 AA 2.4.7
                    // (compliance audit rule 13). aria-label on each,
                    // since an icon alone has no accessible name.
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(note)} aria-label={`Edit "${note.title}"`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(note.id)} aria-label={`Delete "${note.title}"`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">{note.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Updated {new Date(note.updated_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) handleClose() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit note' : 'New note'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="note-title">Title</Label>
              <Input
                id="note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Supplier contact info…"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-content">Content</Label>
              <textarea
                id="note-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="Write your note here…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save note'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
