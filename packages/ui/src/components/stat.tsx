import * as React from 'react'
import { cn } from '../lib/utils'

interface StatProps {
  label: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  className?: string
}

function Stat({ label, value, change, changeType = 'neutral', className }: StatProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {change && (
        <p
          className={cn('text-xs', {
            'text-success': changeType === 'positive',
            'text-destructive': changeType === 'negative',
            'text-muted-foreground': changeType === 'neutral',
          })}
        >
          {change}
        </p>
      )}
    </div>
  )
}

export { Stat }
