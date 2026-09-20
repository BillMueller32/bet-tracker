function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="h-3 w-32 rounded bg-neutral-800" />
      <div className="mt-2 h-5 w-40 rounded bg-neutral-800" />
      <div className="mt-2 h-3 w-24 rounded bg-neutral-800" />
    </div>
  );
}

export default function InsightsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="animate-pulse">
        <div className="h-5 w-20 rounded bg-neutral-800" />
        <div className="mt-2 h-3 w-64 rounded bg-neutral-800" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
