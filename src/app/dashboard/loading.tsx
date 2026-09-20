function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg border border-neutral-800 bg-neutral-900 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="h-5 w-28 animate-pulse rounded bg-neutral-800" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Block key={i} className="h-20" />
        ))}
      </div>
      <Block className="h-64" />
      <Block className="h-40" />
      <Block className="h-48" />
    </div>
  );
}
