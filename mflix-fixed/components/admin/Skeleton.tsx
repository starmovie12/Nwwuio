'use client';

interface SkeletonProps {
  type?: 'table' | 'card' | 'stats' | 'line';
  rows?: number;
  count?: number;
  className?: string;
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`bg-white/5 rounded animate-pulse ${className}`} />;
}

export default function Skeleton({ type = 'line', rows = 5, count = 4, className }: SkeletonProps) {
  if (type === 'stats') {
    return (
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white/3 border border-white/5 rounded-2xl p-4 space-y-3">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-8 w-16" />
            <SkeletonBlock className="h-2 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white/3 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex gap-3 items-center">
              <SkeletonBlock className="w-12 h-16 rounded-lg" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-3 w-3/4" />
                <SkeletonBlock className="h-2 w-1/2" />
              </div>
            </div>
            <SkeletonBlock className="h-2 w-full" />
            <SkeletonBlock className="h-2 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Header */}
        <div className="flex gap-4 px-4 py-2">
          {[8, 24, 12, 10, 8].map((w, i) => (
            <SkeletonBlock key={i} className={`h-3 w-${w}`} style={{ width: `${w}%` }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 bg-white/3 border border-white/5 rounded-xl px-4 py-3 items-center">
            <SkeletonBlock className="w-4 h-4 rounded" />
            <SkeletonBlock className="h-3 flex-1" />
            <SkeletonBlock className="h-5 w-20 rounded-full" />
            <SkeletonBlock className="h-3 w-12" />
            <SkeletonBlock className="h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  // Default line skeleton
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} className="h-3 w-full" style={{ opacity: 1 - i * 0.1 }} />
      ))}
    </div>
  );
}
