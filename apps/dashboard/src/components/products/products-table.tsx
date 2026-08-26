'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import { DataTable, Button, Badge } from '@stockalert/ui'

export type ProductRow = {
  id: string
  externalId: string
  title: string
  sku: string | null
  barcode: string | null
  imageUrl: string | null
  productUrl: string | null
  platform: string
  quantity: number | null
  lastSyncedAt: string | null
  storeName: string
  daysUntilStockout: number | null
}

const PLATFORM_LABELS: Record<string, string> = {
  shopify: 'Shopify',
  trendyol: 'Trendyol',
  amazon: 'Amazon',
  etsy: 'Etsy',
  ebay: 'eBay',
  hepsiburada: 'Hepsiburada',
  aliexpress: 'AliExpress',
}

function QuantityBadge({ quantity }: { quantity: number | null }) {
  if (quantity === null) return <span className="text-muted-foreground text-xs">—</span>
  if (quantity === 0) return <Badge variant="destructive">Out of stock</Badge>
  if (quantity <= 5) return <Badge variant="secondary" className="bg-orange-100 text-orange-800">{String(quantity)} low</Badge>
  return <Badge variant="secondary">{String(quantity)}</Badge>
}

const columns: ColumnDef<ProductRow>[] = [
  {
    accessorKey: 'imageUrl',
    header: '',
    cell: ({ row }) => {
      const url = row.getValue<string | null>('imageUrl')
      return url ? (
        <Image src={url} alt="" width={40} height={40} className="rounded object-cover" />
      ) : (
        <div className="h-10 w-10 rounded bg-muted" />
      )
    },
    enableSorting: false,
    enableHiding: false,
    size: 56,
  },
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Product <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const url = row.original.productUrl
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium leading-snug">{row.getValue<string>('title')}</span>
          {row.original.sku && (
            <span className="text-xs text-muted-foreground">SKU: {row.original.sku}</span>
          )}
          {row.original.barcode && (
            <span className="text-xs text-muted-foreground">Barcode: {row.original.barcode}</span>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View listing <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'platform',
    header: 'Platform',
    cell: ({ row }) => {
      const platform = row.getValue<string>('platform')
      return <span className="text-sm">{PLATFORM_LABELS[platform] ?? platform}</span>
    },
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'storeName',
    header: 'Store',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.getValue<string>('storeName')}</span>,
  },
  {
    accessorKey: 'quantity',
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Stock <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <QuantityBadge quantity={row.getValue<number | null>('quantity')} />,
  },
  {
    accessorKey: 'lastSyncedAt',
    header: 'Last synced',
    cell: ({ row }) => {
      const val = row.getValue<string | null>('lastSyncedAt')
      if (!val) return <span className="text-xs text-muted-foreground">—</span>
      return (
        <span className="text-xs text-muted-foreground">
          {new Date(val).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      )
    },
  },
  {
    accessorKey: 'daysUntilStockout',
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Est. stockout <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const days = row.getValue<number | null>('daysUntilStockout')
      if (days === null) return <span className="text-xs text-muted-foreground">—</span>
      if (days <= 3) return <Badge variant="destructive">{String(days)}d</Badge>
      if (days <= 14) return <Badge variant="secondary" className="bg-orange-100 text-orange-800">{String(days)}d</Badge>
      return <span className="text-sm text-muted-foreground">{String(days)}d</span>
    },
  },
]

export function ProductsTable({ products }: { products: ProductRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={products}
      searchKey="title"
      searchPlaceholder="Search products…"
    />
  )
}
