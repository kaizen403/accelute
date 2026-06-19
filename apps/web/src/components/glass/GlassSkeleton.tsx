interface GlassSkeletonProps {
  className?: string;
}

export function GlassSkeleton({ className = "" }: GlassSkeletonProps) {
  return (
    <div
      className={`animate-shimmer rounded-lg bg-white/[0.06] ${className}`.trim()}
      aria-hidden
    />
  );
}

export function RunsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <GlassSkeleton className="h-6 w-16" />
          <GlassSkeleton className="h-6 flex-1" />
          <GlassSkeleton className="hidden h-6 w-24 md:block" />
        </div>
      ))}
    </div>
  );
}

export function RunReviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <GlassSkeleton className="h-4 w-16" />
        <GlassSkeleton className="h-8 w-3/4 max-w-lg" />
        <GlassSkeleton className="h-4 w-48" />
      </div>
      <div className="glass-panel space-y-4 p-6">
        <GlassSkeleton className="h-4 w-20" />
        <GlassSkeleton className="h-6 w-32" />
        <GlassSkeleton className="h-16 w-full" />
      </div>
      <div className="glass-panel p-6">
        <GlassSkeleton className="aspect-video w-full" />
      </div>
    </div>
  );
}
