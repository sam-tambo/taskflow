import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function TaskRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-5 h-5 rounded-full" />
      <Skeleton className="h-4 flex-1 max-w-[300px] rounded" />
      <Skeleton className="h-6 w-6 rounded-full" />
      <Skeleton className="h-4 w-20 rounded" />
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
      <Skeleton className="h-4 w-3/4 mb-3 rounded" />
      <Skeleton className="h-3 w-1/2 mb-4 rounded" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="p-8 space-y-4">
      <Skeleton className="h-8 w-48 rounded" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-3/4 rounded" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}
