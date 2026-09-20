function SkeletonField() {
  return (
    <div className="animate-pulse">
      <div className="mb-1 h-3 w-16 rounded bg-neutral-800" />
      <div className="h-11 rounded-md bg-neutral-800" />
    </div>
  );
}

export default function EditBetLoading() {
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 h-5 w-24 animate-pulse rounded bg-neutral-800" />
      <h1 className="mb-4 text-lg font-semibold text-neutral-100">
        Edit bet
      </h1>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonField key={i} />
        ))}
      </div>
    </div>
  );
}
