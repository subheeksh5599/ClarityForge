export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse bg-text/[0.04] rounded-sm ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SkeletonLine({ width = "100%" }: { width?: string }) {
  return <Skeleton className="h-3" style={{ width }} />;
}

export function SkeletonCard() {
  return (
    <div className="border border-line p-6 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-3 w-48" />
    </div>
  );
}

export function SkeletonEditor() {
  return (
    <div className="h-full bg-surface p-6 space-y-2 font-mono">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/3" />
      <div className="pt-4">
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/4" />
    </div>
  );
}
