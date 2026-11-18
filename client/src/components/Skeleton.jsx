export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-sm bg-line/60 ${className}`} />;
}

export function CardGridSkeleton({ count = 3 }) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-sm border border-line bg-surface p-5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-3 h-5 w-32" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function ProjectSkeleton() {
  return (
    <div>
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-3 h-7 w-40" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </div>
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>
      <div className="mt-4 space-y-px overflow-hidden rounded-sm border border-line">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-none" />
        ))}
      </div>
    </div>
  );
}