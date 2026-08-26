'use client'

import { useTranslations } from 'next-intl'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, Avatar, AvatarFallback, Button,
  Popover, PopoverContent, PopoverTrigger,
} from '@stockalert/ui'
import { Sun, Moon, LogOut, Settings, User, ChevronsUpDown, Check, Search } from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { type Locale } from '@stockalert/i18n'
import { logoutAction } from '../../actions/auth'
import { CreateTeamDialog } from '../settings/create-team-dialog'

interface Team {
  id: string
  name: string
  slug: string
}

interface TopbarProps {
  userEmail?: string
  userName?: string
  teams?: Team[]
  currentTeamId?: string
  onCommandPaletteOpen?: () => void
}

export function Topbar({ userEmail, userName, teams = [], currentTeamId, onCommandPaletteOpen }: TopbarProps) {
  const t = useTranslations('common')
  const locale = useLocale() as Locale
  const { theme, setTheme } = useTheme()

  const currentTeam = teams.find((t) => t.id === currentTeamId) ?? teams[0]

  // Runs server-side (actions/auth.ts) so signOut()'s token revocation is
  // guaranteed to actually happen and its result is checked/logged, instead
  // of a client-only signOut() whose failure silently left tokens valid.
  // See 2nd security audit item 4.
  async function handleLogout() {
    await logoutAction()
  }

  const initials = userName
    ? userName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : userEmail?.[0]?.toUpperCase() ?? 'U'

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      {/* Workspace switcher */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="h-8 gap-2 px-2 text-sm font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
              {currentTeam?.name?.[0]?.toUpperCase() ?? 'T'}
            </div>
            <span className="max-w-[120px] truncate">{currentTeam?.name ?? 'Takım seç'}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1" align="start">
          <div className="mb-1 px-2 py-1 text-xs font-medium text-muted-foreground">Takımlar</div>
          {teams.map((team) => (
            <button
              key={team.id}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => {/* team switch */}}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold">
                {team.name[0]?.toUpperCase()}
              </div>
              <span className="flex-1 truncate">{team.name}</span>
              {team.id === currentTeam?.id && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
          <div className="my-1 border-t border-border" />
          <CreateTeamDialog />
        </PopoverContent>
      </Popover>

      {/* ⌘K search button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onCommandPaletteOpen}
        className="hidden h-8 gap-2 px-3 text-muted-foreground sm:flex border-border/60 hover:border-primary/30 hover:text-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Ara veya git…</span>
        <kbd className="ml-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </Button>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Tema değiştir"
          className="text-muted-foreground hover:text-foreground"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* User menu — aria-label rather than relying on the avatar
            initials as the accessible name (WCAG 2.1 AA; compliance
            audit rule 13). See e2e/dashboard-auth-flow.spec.ts, which
            previously had to target this as "the last button in the
            header" for lack of one. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full" size="icon" aria-label="Kullanıcı menüsü">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-0.5">
                {userName && <p className="text-sm font-medium">{userName}</p>}
                {userEmail && <p className="text-xs text-muted-foreground">{userEmail}</p>}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/${locale}/settings/account`} className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Hesap
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${locale}/settings/billing`} className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Faturalama
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-destructive">
              <LogOut className="h-4 w-4" />
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
