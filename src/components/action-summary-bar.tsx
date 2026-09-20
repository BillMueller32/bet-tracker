import { StatTile } from "@/components/stat-tile";
import { formatSignedDollars, formatStake, profitTextClass } from "@/lib/bets/format";
import type { ActionSummary } from "@/lib/bets/action-summary";

export function ActionSummaryBar({ summary }: { summary: ActionSummary }) {
  if (summary.inPlayCount === 0) return null;

  const hasLiveRead = summary.projectedCount > 0;

  return (
    <div className="mb-4 space-y-1.5">
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="In play"
          value={String(summary.inPlayCount)}
          sub={
            summary.liveCount > 0
              ? `${summary.liveCount} live now`
              : "not started yet"
          }
        />
        <StatTile
          label="At risk"
          value={formatStake(summary.atRisk)}
          sub={`returns up to ${formatStake(summary.potentialPayout)}`}
        />
        <StatTile
          label="Live P/L"
          value={hasLiveRead ? formatSignedDollars(summary.projected) : "—"}
          valueClass={hasLiveRead ? profitTextClass(summary.projected) : undefined}
          sub={hasLiveRead ? "from current scores" : "no live games yet"}
        />
      </div>
      {hasLiveRead && (
        <p className="text-xs text-neutral-400">
          Live P/L is an estimate based on current scores, not a final result.
        </p>
      )}
    </div>
  );
}
