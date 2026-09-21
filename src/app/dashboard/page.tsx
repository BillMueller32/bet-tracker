import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Bet } from "@/lib/bets/constants";
import { groupStats, overallStats } from "@/lib/bets/stats";
import { currentStreak } from "@/lib/bets/timeseries";
import { gradePendingBets } from "@/lib/bets/grading";
import { computeOpenAction } from "@/lib/bets/open-action";
import {
  collectLiveStatusRequests,
  fetchLiveStatuses,
} from "@/lib/sports/live-status";
import {
  formatPercent,
  formatSignedDollars,
  profitTextClass,
} from "@/lib/bets/format";
import { StatTile } from "@/components/stat-tile";
import { PLChart } from "@/components/pl-chart";
import { SportBreakdown } from "@/components/sport-breakdown";
import { BetFeedItem } from "@/components/bet-feed-item";
import { OpenActionPanel } from "@/components/open-action-panel";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: bets, error }, { data: settings }] = await Promise.all([
    supabase
      .from("bets")
      .select("*, bet_legs(*)")
      .order("placed_at", { ascending: false }),
    user
      ? supabase
          .from("user_settings")
          .select("bankroll")
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const liveStatuses = bets
    ? await fetchLiveStatuses(collectLiveStatusRequests(bets))
    : new Map();
  if (bets) await gradePendingBets(supabase, bets, liveStatuses);

  const allBets: Bet[] = bets ?? [];
  const overall = overallStats(allBets);
  const streak = currentStreak(allBets);
  const bySport = groupStats(allBets, (b) => ({ key: b.sport, label: b.sport }));
  const recent = allBets.slice(0, 6);
  const openAction = computeOpenAction(allBets, liveStatuses, settings?.bankroll ?? null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-lg font-semibold text-neutral-100">Dashboard</h1>

      {error && (
        <p className="rounded-md border border-red-900 bg-red-950 p-3 text-sm text-red-300">
          Couldn&apos;t load your bets: {error.message}
        </p>
      )}

      {!error && allBets.length === 0 && (
        <div className="rounded-md border border-dashed border-neutral-700 p-6 text-center text-sm text-neutral-400">
          No bets yet. Log your first one to start building your performance
          picture.
          <div className="mt-3">
            <Link
              href="/bets/new"
              className="inline-block rounded-md bg-neutral-100 px-4 py-2.5 text-sm font-medium text-neutral-900"
            >
              Add a bet
            </Link>
          </div>
        </div>
      )}

      {!error && allBets.length > 0 && (
        <>
          <OpenActionPanel action={openAction} />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <StatTile
              label="Total profit"
              value={formatSignedDollars(overall.profit)}
              valueClass={profitTextClass(overall.profit)}
            />
            <StatTile
              label="ROI"
              value={overall.roi === null ? "—" : formatPercent(overall.roi)}
              valueClass={overall.roi === null ? undefined : profitTextClass(overall.roi)}
            />
            <StatTile
              label="Record"
              value={`${overall.wins}-${overall.losses}${overall.pushes > 0 ? `-${overall.pushes}` : ""}`}
            />
            <StatTile
              label="Win rate"
              value={overall.winRate === null ? "—" : formatPercent(overall.winRate)}
            />
            <StatTile
              label="Streak"
              value={streak.type ? `${streak.type}${streak.count}` : "—"}
              valueClass={
                streak.type === "W"
                  ? "text-green-400"
                  : streak.type === "L"
                    ? "text-red-400"
                    : undefined
              }
              sub={streak.type ? undefined : "No streak yet"}
            />
          </div>

          <PLChart bets={allBets} />

          <SportBreakdown rows={bySport} />

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-200">Recent bets</h2>
              <Link
                href="/bets"
                className="rounded-md px-1.5 py-1 text-xs font-medium text-neutral-400 hover:text-neutral-200"
              >
                See all
              </Link>
            </div>
            <ul className="divide-y divide-neutral-800/80">
              {recent.map((bet) => (
                <li key={bet.id}>
                  <BetFeedItem bet={bet} />
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
