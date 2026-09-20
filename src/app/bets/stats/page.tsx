import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SPORTS, BET_TYPES } from "@/lib/bets/constants";
import { overallStats, groupStats, type StatBet, type StatRow } from "@/lib/bets/stats";
import {
  formatPercent,
  formatSignedDollars,
  formatStake,
  profitTextClass,
} from "@/lib/bets/format";

function sportLabel(value: string): string {
  return SPORTS.find((s) => s.value === value)?.label ?? value;
}

function betTypeLabel(value: string): string {
  return BET_TYPES.find((t) => t.value === value)?.label ?? value;
}

function StatTile({
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
    <div className="rounded-md border border-neutral-800 bg-neutral-900 p-3">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className={`text-lg font-semibold ${valueClass ?? "text-neutral-100"}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}

function GroupTable({ title, rows }: { title: string; rows: StatRow[] }) {
  const decidedRows = rows.filter((r) => r.wins + r.losses + r.pushes > 0);

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-neutral-200">{title}</h2>
      {decidedRows.length === 0 ? (
        <p className="text-sm text-neutral-400">No decided bets yet.</p>
      ) : (
        <div className="overflow-hidden rounded-md border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-xs text-neutral-400">
                <th className="px-3 py-2 font-medium">Group</th>
                <th className="px-3 py-2 font-medium">Record</th>
                <th className="px-3 py-2 font-medium">Win %</th>
                <th className="px-3 py-2 text-right font-medium">Profit</th>
              </tr>
            </thead>
            <tbody>
              {decidedRows.map((row) => (
                <tr key={row.key} className="border-b border-neutral-800 last:border-0">
                  <td className="px-3 py-2 text-neutral-200">{row.label}</td>
                  <td className="px-3 py-2 text-neutral-400">
                    {row.wins}-{row.losses}
                    {row.pushes > 0 ? `-${row.pushes}` : ""}
                  </td>
                  <td className="px-3 py-2 text-neutral-400">
                    {row.winRate === null ? "—" : formatPercent(row.winRate)}
                  </td>
                  <td className={`px-3 py-2 text-right ${profitTextClass(row.profit)}`}>
                    {formatSignedDollars(row.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default async function StatsPage() {
  const supabase = await createClient();
  const { data: bets, error } = await supabase
    .from("bets")
    .select("sport, bet_type, status, odds, stake");

  const statBets: StatBet[] = bets ?? [];
  const overall = overallStats(statBets);
  const bySport = groupStats(statBets, (b) => ({
    key: b.sport,
    label: sportLabel(b.sport),
  }));
  const byBetType = groupStats(statBets, (b) => ({
    key: b.bet_type,
    label: betTypeLabel(b.bet_type),
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/bets"
        className="mb-4 inline-block text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Back to bets
      </Link>
      <h1 className="mb-4 text-lg font-semibold text-neutral-100">Stats</h1>

      {error && (
        <p className="rounded-md border border-red-900 bg-red-950 p-3 text-sm text-red-300">
          Couldn&apos;t load stats: {error.message}
        </p>
      )}

      {!error && overall.wins + overall.losses + overall.pushes === 0 && (
        <p className="rounded-md border border-dashed border-neutral-700 p-6 text-center text-sm text-neutral-400">
          No decided bets yet — stats fill in once some of your bets are
          won, lost, or pushed.
        </p>
      )}

      {!error && overall.wins + overall.losses + overall.pushes > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile
              label="Record"
              value={`${overall.wins}-${overall.losses}${overall.pushes > 0 ? `-${overall.pushes}` : ""}`}
            />
            <StatTile
              label="Win rate"
              value={overall.winRate === null ? "—" : formatPercent(overall.winRate)}
            />
            <StatTile
              label="Net profit"
              value={formatSignedDollars(overall.profit)}
              valueClass={profitTextClass(overall.profit)}
              sub={`${formatStake(overall.staked)} staked`}
            />
            <StatTile
              label="ROI"
              value={overall.roi === null ? "—" : formatPercent(overall.roi)}
              valueClass={overall.roi === null ? undefined : profitTextClass(overall.roi)}
            />
          </div>

          <GroupTable title="By sport" rows={bySport} />
          <GroupTable title="By bet type" rows={byBetType} />

          {overall.pending > 0 && (
            <p className="text-xs text-neutral-400">
              {overall.pending} bet{overall.pending === 1 ? "" : "s"} still
              pending — not included above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
