import { StatTile } from "@/components/stat-tile";
import { formatSignedDollars, formatStake, profitTextClass } from "@/lib/bets/format";
import type { DaySummary } from "@/lib/bets/action-summary";

export function ActionSummaryBar({ summary }: { summary: DaySummary }) {
  const inPlayCount = summary.pendingCount + summary.liveCount + summary.needsReviewCount;
  if (summary.settledCount === 0 && inPlayCount === 0) return null;

  const hasLiveRead = summary.projectedCount > 0;
  const hasSettled = summary.settledCount > 0;

  const netSub = hasLiveRead
    ? `settled ${formatSignedDollars(summary.settledProfit)} · live ${formatSignedDollars(summary.liveProjected)}`
    : hasSettled
      ? "settled today"
      : "nothing settled yet";

  const statusParts: string[] = [];
  if (summary.liveCount > 0) statusParts.push(`${summary.liveCount} live`);
  if (summary.pendingCount > 0) statusParts.push(`${summary.pendingCount} not started`);
  if (summary.needsReviewCount > 0) statusParts.push(`${summary.needsReviewCount} needs review`);

  return (
    <div className="mb-4 space-y-1.5">
      <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">Today</p>
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="Net P&L"
          value={formatSignedDollars(summary.netProfit)}
          valueClass={profitTextClass(summary.netProfit)}
          sub={netSub}
        />
        <StatTile
          label="Record"
          value={`${summary.wins}-${summary.losses}${summary.pushes > 0 ? `-${summary.pushes}` : ""}`}
          sub="settled today"
        />
        <StatTile
          label="At risk"
          value={formatStake(summary.atRisk)}
          sub={inPlayCount > 0 ? `returns up to ${formatStake(summary.potentialPayout)}` : "nothing in play"}
        />
      </div>
      {statusParts.length > 0 && (
        <p className="text-xs text-neutral-400">{statusParts.join(" · ")}</p>
      )}
      {hasLiveRead && (
        <p className="text-xs text-neutral-400">
          The live portion is an estimate based on current scores, not a final result.
        </p>
      )}
      {summary.needsReviewCount > 0 && (
        <p className="rounded-md bg-amber-950 px-2.5 py-1.5 text-xs font-medium text-amber-300">
          {summary.needsReviewCount} bet{summary.needsReviewCount === 1 ? "" : "s"} already
          final — scroll down to confirm the result.
        </p>
      )}
    </div>
  );
}
