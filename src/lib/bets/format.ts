export function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

export function formatStake(stake: number): string {
  return `$${stake.toFixed(2)}`;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-neutral-800 text-neutral-300",
  live: "bg-amber-950 text-amber-300",
  won: "bg-green-950 text-green-300",
  lost: "bg-red-950 text-red-300",
  push: "bg-blue-950 text-blue-300",
  cancelled: "bg-neutral-900 text-neutral-500",
};

export function statusBadgeClass(status: string): string {
  return STATUS_STYLES[status] ?? STATUS_STYLES.pending;
}
