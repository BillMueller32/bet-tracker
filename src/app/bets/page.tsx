import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BetCard } from "@/components/bet-card";
import type { Bet } from "@/lib/bets/constants";
import {
  fetchLiveStatuses,
  type LiveStatusRequest,
} from "@/lib/sports/live-status";
import type { EspnEvent } from "@/lib/sports/espn";
import { combineLegOutcomes, gradeLeg, gradeSingleBet } from "@/lib/bets/grade";

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

function collectLiveStatusRequests(bets: Bet[]): LiveStatusRequest[] {
  const requests: LiveStatusRequest[] = [];

  for (const bet of bets) {
    if (!ACTIVE_STATUSES.has(bet.status)) continue;

    const legs = bet.bet_legs ?? [];
    if (legs.length > 0) {
      for (const leg of legs) {
        if (leg.external_event_id && leg.event_start) {
          requests.push({
            sport: leg.sport,
            eventDate: leg.event_start.slice(0, 10),
            externalEventId: leg.external_event_id,
          });
        }
      }
    } else if (bet.external_event_id && bet.event_start) {
      requests.push({
        sport: bet.sport,
        eventDate: bet.event_start.slice(0, 10),
        externalEventId: bet.external_event_id,
      });
    }
  }

  return requests;
}

// Settles bets whose linked game(s) have gone final, mutating each bet's
// status/result_value in place and persisting the same to Supabase.
// Mechanical bet types (moneyline/spread/total) grade automatically;
// anything grade*() can't confidently resolve (props, a push, a leg
// whose game isn't final yet) is left as-is for manual review.
async function gradePendingBets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bets: Bet[],
  liveStatuses: Map<string, EspnEvent>,
): Promise<void> {
  for (const bet of bets) {
    if (!ACTIVE_STATUSES.has(bet.status)) continue;

    const legs = bet.bet_legs ?? [];
    let outcome: "won" | "lost" | "push" | null = null;
    let detail = "";

    if (legs.length > 0) {
      const legResults = legs.map((leg) => {
        const event = leg.external_event_id
          ? liveStatuses.get(leg.external_event_id)
          : undefined;
        return event ? gradeLeg(leg, event) : null;
      });
      outcome = combineLegOutcomes(legResults.map((r) => r?.outcome ?? null));
      detail = legResults
        .map((r) => r?.detail)
        .filter((d): d is string => !!d)
        .join(" | ");
    } else if (bet.external_event_id) {
      const event = liveStatuses.get(bet.external_event_id);
      if (event) {
        const result = gradeSingleBet(bet, event);
        outcome = result?.outcome ?? null;
        detail = result?.detail ?? "";
      }
    }

    if (!outcome) continue;

    const { error } = await supabase
      .from("bets")
      .update({
        status: outcome,
        result_value: detail || null,
        settled_at: new Date().toISOString(),
      })
      .eq("id", bet.id);

    if (!error) {
      bet.status = outcome;
      bet.result_value = detail || null;
    }
  }
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

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-100">Your bets</h1>
        <div className="flex gap-2">
          <Link
            href="/bets/new/screenshot"
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-100"
          >
            From screenshot
          </Link>
          <Link
            href="/bets/new"
            className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900"
          >
            Add bet
          </Link>
        </div>
      </div>

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
        <ul className="space-y-2">
          {sortedBets.map((bet) => (
            <li key={bet.id}>
              <BetCard bet={bet} liveStatuses={liveStatuses} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
