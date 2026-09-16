import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('bg-surface-muted block animate-pulse rounded', className)}
    />
  );
}

function SkeletonRow() {
  return (
    <div className="px-3 py-4">
      <span className="mb-1 flex items-center gap-2">
        <Skeleton className="size-2 shrink-0 rounded-full" />
        <Skeleton className="h-3 w-28" />
      </span>

      <Skeleton className="h-4.5 w-[70%]" />
      <Skeleton className="mt-1.5 h-3.5 w-[45%]" />
    </div>
  );
}

export function PostListSkeleton() {
  return (
    <div className="divide-line-subtle divide-y">
      {Array.from({ length: 5 }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
