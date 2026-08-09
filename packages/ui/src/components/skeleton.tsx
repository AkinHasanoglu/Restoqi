import { cn } from '../lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-skeleton-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}

function SkeletonRow({ cols = 3 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 p-4">
      <Skeleton className="h-8 w-8 rounded-full" />
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  )
}

export { Skeleton, SkeletonRow }
