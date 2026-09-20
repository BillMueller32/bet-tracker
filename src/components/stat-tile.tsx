export function StatTile({
  label,
  value,
  valueClass,
  sub,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-xs font-medium text-neutral-400">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tracking-tight ${valueClass ?? "text-neutral-100"}`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}
