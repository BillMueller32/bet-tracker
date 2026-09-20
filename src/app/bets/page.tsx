import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BetsList } from "@/components/bets-list";
import { ActionSummaryBar } from "@/components/action-summary-bar";
import type { Bet } from "@/lib/bets/constants";
import {
  collectLiveStatusRequests,
  fetchLiveStatuses,
} from "@/lib/sports/live-status";
import { computeDaySummary } from "@/lib/bets/action-summary";
import { gradePendingBets } from "@/lib/bets/grading";

const ACTIVE_STATUSES = new Set(["pending", "live"]);

function sortBets(bets: Bet[]): Bet[] {
  return [...bets].sort((a, b) => {
    const aActive = ACTIVE_STATUSES.has(a.status);
    const bActive = ACTIVE_STATUSES.has(b.status);
    if (aActive !== bActive) return aActive ? -1 : 1;
    return (
      new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime()
    );
  });
}

export default async function BetsPage() {
  const supabase = await createClient();
  const { data: bets, error } = await supabase
    .from("bets")
    .select("*, bet_legs(*)")
    .order("placed_at", { ascending: false })
    .order("leg_order", { referencedTable: "bet_legs" });

  const liveStatuses = await fetchLiveStatuses(
    collectLiveStatusRequests(bets ?? []),
  );
  if (bets) await gradePendingBets(supabase, bets, liveStatuses);

  const sortedBets = bets ? sortBets(bets) : [];
  const summary = bets ? computeDaySummary(bets, liveStatuses) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-neutral-100">Your bets</h1>
        <div className="flex gap-2">
          <Link
            href="/bets/new/screenshot"
            className="rounded-md border border-neutral-700 px-3 py-2.5 text-sm font-medium text-neutral-100"
          >
            From screenshot
          </Link>
          <Link
            href="/bets/new"
            className="rounded-md bg-neutral-100 px-3 py-2.5 text-sm font-medium text-neutral-900"
          >
            Add bet
          </Link>
        </div>
      </div>

      {summary && <ActionSummaryBar summary={summary} />}

      {error && (
        <p className="rounded-md border border-red-900 bg-red-950 p-3 text-sm text-red-300">
          Couldn&apos;t load bets: {error.message}
        </p>
      )}

      {!error && sortedBets.length === 0 && (
        <p className="rounded-md border border-dashed border-neutral-700 p-6 text-center text-sm text-neutral-400">
          No bets yet. Tap &quot;Add bet&quot; to log your first one.
        </p>
      )}

      {!error && sortedBets.length > 0 && (
        <BetsList bets={sortedBets} liveStatuses={liveStatuses} />
      )}
    </div>
  );
}
