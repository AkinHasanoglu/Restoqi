'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, cn } from '@stockalert/ui'
import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: number | string
  icon: ReactNode
  iconBg: string
  trend?: { direction: 'up' | 'down'; label: string }
}

export function StatCard({ label, value, icon, iconBg, trend }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
              {trend && (
                <div className={cn(
                  'mt-1.5 flex items-center gap-1 text-xs font-medium',
                  trend.direction === 'up' ? 'text-green-600' : 'text-red-500'
                )}>
                  {trend.direction === 'up'
                    ? <TrendingUp className="h-3.5 w-3.5" />
                    : <TrendingDown className="h-3.5 w-3.5" />
                  }
                  {trend.label}
                </div>
              )}
            </div>
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: iconBg }}
            >
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
