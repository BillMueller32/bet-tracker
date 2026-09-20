import type { Bet } from "@/lib/bets/constants";
import { combineLegOutcomes, gradeLeg, gradeSingleBet } from "@/lib/bets/grade";
import { estimateGameEnd } from "@/lib/bets/time";
import type { EspnEvent } from "@/lib/sports/espn";
import type { createClient } from "@/lib/supabase/server";

const ACTIVE_STATUSES = new Set(["pending", "live"]);

// Best-effort estimate of when a bet's outcome was actually decided, for
// settled_at — the latest scheduled end time across its linked game(s),
// falling back to now() only when nothing is linked (e.g. a manually
// entered result with no event_start at all).
function estimateSettledAt(bet: Bet): string {
  const legs = bet.bet_legs ?? [];
  const starts =
    legs.length > 0
      ? legs
          .filter((leg) => leg.event_start)
          .map((leg) => estimateGameEnd(leg.event_start!, leg.sport))
      : bet.event_start
        ? [estimateGameEnd(bet.event_start, bet.sport)]
        : [];

  if (starts.length === 0) return new Date().toISOString();

  const latest = starts.reduce((a, b) => (b > a ? b : a));
  // Never claim a future settle time — grading only ever runs after the
  // fact, so if the estimate somehow lands after "now" (a short game, a
  // generous duration constant), fall back to now() instead.
  const now = new Date();
  return (latest < now ? latest : now).toISOString();
}

// Settles bets whose linked game(s) have gone final, mutating each bet's
// status/result_value/settled_at in place and persisting the same to
// Supabase. Mechanical bet types (moneyline/spread/total) grade
// automatically; anything grade*() can't confidently resolve (props, a
// push, a leg whose game isn't final yet) is left as-is for manual review.
//
// Shared by every page that reads bets (Dashboard, Analytics, Bets) so
// none of them can show a pending bet that should already be settled.
export async function gradePendingBets(
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

    const settledAt = estimateSettledAt(bet);
    const { error } = await supabase
      .from("bets")
      .update({
        status: outcome,
        result_value: detail || null,
        settled_at: settledAt,
      })
      .eq("id", bet.id);

    if (!error) {
      bet.status = outcome;
      bet.result_value = detail || null;
      bet.settled_at = settledAt;
    }
  }
}
