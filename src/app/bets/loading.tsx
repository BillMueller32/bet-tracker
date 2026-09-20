function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="h-3 w-24 rounded bg-neutral-800" />
        <div className="h-5 w-14 rounded-full bg-neutral-800" />
      </div>
      <div className="h-4 w-2/3 rounded bg-neutral-800" />
      <div className="mt-2 h-3 w-1/2 rounded bg-neutral-800" />
      <div className="mt-3 flex gap-2">
        <div className="h-5 w-14 rounded bg-neutral-800" />
        <div className="h-5 w-20 rounded bg-neutral-800" />
      </div>
    </div>
  );
}

export default function BetsLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-neutral-100">Your bets</h1>
        </div>
      </div>
      <ul className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <SkeletonCard />
          </li>
        ))}
      </ul>
    </div>
  );
}
