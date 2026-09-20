import Link from "next/link";
import type { StatRow } from "@/lib/bets/stats";
import { formatPercent, formatSignedDollars, profitTextClass, sportEmoji } from "@/lib/bets/format";
import { SPORTS } from "@/lib/bets/constants";

function sportLabel(value: string): string {
  return SPORTS.find((s) => s.value === value)?.label ?? value;
}

export function SportBreakdown({ rows }: { rows: StatRow[] }) {
  const decided = rows
    .filter((r) => r.wins + r.losses + r.pushes > 0)
    .sort((a, b) => b.profit - a.profit);

  if (decided.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-1 text-sm font-semibold text-neutral-200">By sport</h2>
        <p className="text-sm text-neutral-400">No decided bets yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-200">By sport</h2>
      <ul className="divide-y divide-neutral-800/80">
        {decided.map((row) => (
          <li key={row.key}>
            <Link
              href={`/analytics?sport=${row.key}`}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:opacity-80"
            >
              <span className="flex items-center gap-2 text-sm text-neutral-100">
                <span className="text-base leading-none">{sportEmoji(row.key)}</span>
                {sportLabel(row.key)}
              </span>
              <span className="text-right text-sm">
                <span className={`font-semibold ${profitTextClass(row.profit)}`}>
                  {formatSignedDollars(row.profit)}
                </span>
                {row.roi !== null && (
                  <span className="ml-2 text-neutral-400">
                    {formatPercent(row.roi)} ROI
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
