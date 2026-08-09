'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { type Locale } from '@stockalert/i18n'
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from '@stockalert/ui'
import {
  LayoutDashboard, Package, AlertTriangle, SlidersHorizontal,
  PlugZap, Settings, Plus, RefreshCw, Users, Sun, Moon,
} from 'lucide-react'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const t = useTranslations('dashboard.commandPalette')
  const nav = useTranslations('dashboard.nav')
  const router = useRouter()
  const locale = useLocale() as Locale
  const { setTheme, theme } = useTheme()

  function go(href: string) {
    router.push(`/${locale}${href}`)
    onOpenChange(false)
  }

  const navCommands = [
    { label: nav('overview'), icon: LayoutDashboard, href: '/overview' },
    { label: nav('products'), icon: Package, href: '/products' },
    { label: nav('alerts'), icon: AlertTriangle, href: '/alerts' },
    { label: nav('rules'), icon: SlidersHorizontal, href: '/alerts/rules' },
    { label: nav('integrations'), icon: PlugZap, href: '/integrations' },
    { label: nav('settings'), icon: Settings, href: '/settings/account' },
  ]

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t('placeholder')} />
      <CommandList>
        <CommandEmpty>{t('noResults')}</CommandEmpty>

        <CommandGroup heading={t('navigation')}>
          {navCommands.map(({ label, icon: Icon, href }) => (
            <CommandItem key={href} onSelect={() => go(href)} className="gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t('actions')}>
          <CommandItem onSelect={() => go('/alerts/rules')} className="gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" />
            {t('actions_createRule')}
          </CommandItem>
          <CommandItem onSelect={() => go('/integrations')} className="gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            {t('actions_connectStore')}
          </CommandItem>
          <CommandItem onSelect={() => go('/settings/team')} className="gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            {t('actions_inviteMember')}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Görünüm">
          <CommandItem
            onSelect={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); onOpenChange(false) }}
            className="gap-2"
          >
            {theme === 'dark'
              ? <Sun className="h-4 w-4 text-muted-foreground" />
              : <Moon className="h-4 w-4 text-muted-foreground" />
            }
            {theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
