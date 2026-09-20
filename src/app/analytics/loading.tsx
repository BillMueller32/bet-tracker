function SkeletonTile() {
  return (
    <div className="animate-pulse rounded-md border border-neutral-800 bg-neutral-900 p-3">
      <div className="h-3 w-14 rounded bg-neutral-800" />
      <div className="mt-2 h-5 w-16 rounded bg-neutral-800" />
    </div>
  );
}

export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-neutral-100">Analytics</h1>
        <div className="flex animate-pulse gap-2">
          <div className="h-9 w-24 rounded-md bg-neutral-800" />
          <div className="h-9 w-28 rounded-md bg-neutral-800" />
          <div className="h-9 w-20 rounded-md bg-neutral-800" />
        </div>
      </div>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonTile key={i} />
          ))}
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-20 rounded bg-neutral-800" />
          <div className="h-24 rounded-md border border-neutral-800 bg-neutral-900" />
        </div>
      </div>
    </div>
  );
}
