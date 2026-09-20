import Link from "next/link";
import { StatTile } from "@/components/stat-tile";
import {
  formatPercent,
  formatSignedDollars,
  formatStake,
  profitTextClass,
} from "@/lib/bets/format";
import type { OpenAction } from "@/lib/bets/open-action";

export function OpenActionPanel({ action }: { action: OpenAction }) {
  if (action.betCount === 0) return null;

  const statusParts: string[] = [];
  if (action.liveCount > 0) statusParts.push(`${action.liveCount} live`);
  if (action.pendingCount > 0) statusParts.push(`${action.pendingCount} not started`);
  if (action.needsReviewCount > 0) statusParts.push(`${action.needsReviewCount} needs review`);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-200">Open action</h2>
        <Link
          href="/bets"
          className="rounded-md px-1.5 py-1 text-xs font-medium text-neutral-400 hover:text-neutral-200"
        >
          See all bets
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatTile
          label="At risk"
          value={formatStake(action.atRisk)}
          sub={
            action.bankrollPct !== null
              ? `${formatPercent(action.bankrollPct)} of bankroll`
              : `${action.betCount} open bet${action.betCount === 1 ? "" : "s"}`
          }
        />
        <StatTile
          label="Potential payout"
          value={formatStake(action.atRisk + action.bestCase)}
          sub="if everything wins"
        />
        <StatTile
          label="Live estimate"
          value={formatSignedDollars(action.expectedCase)}
          valueClass={profitTextClass(action.expectedCase)}
          sub="settled + in-progress only"
        />
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <p className="mb-2 text-xs font-medium text-neutral-400">
          Best / worst case across everything open
        </p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-red-400">{formatSignedDollars(action.worstCase)}</span>
          <span className="text-neutral-500">to</span>
          <span className="text-green-400">{formatSignedDollars(action.bestCase)}</span>
        </div>
      </div>

      {statusParts.length > 0 && (
        <p className="text-xs text-neutral-400">{statusParts.join(" · ")}</p>
      )}

      {action.days.length > 0 && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <p className="mb-2 text-xs font-medium text-neutral-400">By day</p>
          <ul className="divide-y divide-neutral-800/80">
            {action.days.map((day) => (
              <li
                key={day.dateKey}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <span className="text-neutral-200">{day.label}</span>
                <span className="text-neutral-400">
                  {day.betCount} bet{day.betCount === 1 ? "" : "s"} ·{" "}
                  {formatStake(day.atRisk)} at risk
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {action.concentrationWarnings.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-amber-900 bg-amber-950/60 p-4">
          <p className="text-xs font-medium text-amber-300">
            Multiple open bets ride on the same game
          </p>
          <ul className="space-y-1">
            {action.concentrationWarnings.map((w) => (
              <li key={w.eventId} className="text-xs text-amber-200">
                {w.label} — {w.betCount} bets, {formatStake(w.atRisk)} combined
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
