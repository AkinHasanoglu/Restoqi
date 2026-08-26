// Utilities
export { cn } from './lib/utils'
export {
  getStoredConsent, setStoredConsent, onConsentChange, type ConsentChoice,
} from './lib/consent'

// Brand
export { Logo } from './components/logo'

// Base components
export { Button, buttonVariants } from './components/button'
export type { ButtonProps } from './components/button'
export { Badge, badgeVariants } from './components/badge'
export type { BadgeProps } from './components/badge'
export { Input } from './components/input'
export type { InputProps } from './components/input'
export { Label } from './components/label'
export { Separator } from './components/separator'
export { Switch } from './components/switch'
export { Checkbox } from './components/checkbox'

// Layout
export {
  Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent,
} from './components/card'

// Navigation
export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup,
  DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuRadioGroup,
} from './components/dropdown-menu'

export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/tabs'

export {
  Select, SelectGroup, SelectValue, SelectTrigger, SelectContent,
  SelectLabel, SelectItem, SelectSeparator,
} from './components/select'

// Overlays
export {
  Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger,
  DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from './components/dialog'

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/tooltip'
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './components/popover'

// Command palette
export {
  Command, CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandShortcut, CommandSeparator,
} from './components/command'

// Data display
export { Avatar, AvatarImage, AvatarFallback } from './components/avatar'
export { ScrollArea, ScrollBar } from './components/scroll-area'
export { Skeleton, SkeletonRow } from './components/skeleton'
export { EmptyState } from './components/empty-state'
export { Stat } from './components/stat'

// Tables
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption } from './components/table'
export { DataTable } from './components/data-table'

// Feedback
export { Toaster, toast } from './components/toast'
export { CookieConsentBanner } from './components/cookie-consent'
export type { CookieConsentBannerProps } from './components/cookie-consent'
export { TurnstileWidget } from './components/turnstile-widget'
export type { TurnstileWidgetProps } from './components/turnstile-widget'
