import { StatTile } from "@/components/stat-tile";
import { formatSignedDollars, formatStake, profitTextClass } from "@/lib/bets/format";
import type { ActionSummary } from "@/lib/bets/action-summary";

export function ActionSummaryBar({ summary }: { summary: ActionSummary }) {
  if (summary.inPlayCount === 0) return null;

  const hasLiveRead = summary.projectedCount > 0;

  const inPlaySubParts: string[] = [];
  if (summary.liveCount > 0) inPlaySubParts.push(`${summary.liveCount} live`);
  if (summary.needsReviewCount > 0) inPlaySubParts.push(`${summary.needsReviewCount} final`);
  const inPlaySub = inPlaySubParts.length > 0 ? inPlaySubParts.join(" · ") : "not started yet";

  return (
    <div className="mb-4 space-y-1.5">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="In play" value={String(summary.inPlayCount)} sub={inPlaySub} />
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
      {summary.needsReviewCount > 0 && (
        <p className="rounded-md bg-amber-950 px-2.5 py-1.5 text-xs font-medium text-amber-300">
          {summary.needsReviewCount} bet{summary.needsReviewCount === 1 ? "" : "s"} already
          final — scroll down to confirm the result.
        </p>
      )}
    </div>
  );
}
