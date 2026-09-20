import { MULTI_LEG_BET_TYPES, type Bet } from "@/lib/bets/constants";
import { americanProfit } from "@/lib/bets/stats";
import {
  combineLegOutcomes,
  previewLegOutcome,
  previewSingleBetOutcome,
} from "@/lib/bets/grade";
import type { EspnEvent } from "@/lib/sports/espn";

export type ActionSummary = {
  inPlayCount: number;
  liveCount: number;
  atRisk: number;
  potentialPayout: number;
  projected: number;
  // How many in-play bets actually contributed a live read (excludes
  // bets whose game(s) haven't started, or that can't be preview-graded
  // at all — props, outrights, a push leg, etc).
  projectedCount: number;
};

const ACTIVE_STATUSES = new Set(["pending", "live"]);

function outcomeProfit(outcome: "won" | "lost" | "push", bet: Bet): number {
  if (outcome === "won") return americanProfit(bet.odds, bet.stake);
  if (outcome === "lost") return -bet.stake;
  return 0;
}

// Estimates "if every in-play game ended right now" from current ESPN
// scores. This is a live read, not a settlement — a leg that's currently
// covering can still flip before the game is actually final.
export function computeActionSummary(
  bets: Bet[],
  liveStatuses: Map<string, EspnEvent>,
): ActionSummary {
  const active = bets.filter((b) => ACTIVE_STATUSES.has(b.status));

  let liveCount = 0;
  let atRisk = 0;
  let potentialPayout = 0;
  let projected = 0;
  let projectedCount = 0;

  for (const bet of active) {
    atRisk += bet.stake;
    potentialPayout += bet.stake + americanProfit(bet.odds, bet.stake);

    const legs = bet.bet_legs ?? [];
    const isMultiLeg = MULTI_LEG_BET_TYPES.includes(bet.bet_type) && legs.length > 0;

    if (isMultiLeg) {
      const events = legs.map((leg) =>
        leg.external_event_id ? liveStatuses.get(leg.external_event_id) : undefined,
      );
      if (events.some((e) => e && e.status.state !== "pre")) liveCount++;

      const previews = legs.map((leg, i) => {
        const event = events[i];
        return event ? previewLegOutcome(leg, event) : null;
      });
      const outcome = combineLegOutcomes(previews);
      if (outcome) {
        projected += outcomeProfit(outcome, bet);
        projectedCount++;
      }
    } else {
      const event = bet.external_event_id ? liveStatuses.get(bet.external_event_id) : undefined;
      if (event && event.status.state !== "pre") liveCount++;

      const outcome = event ? previewSingleBetOutcome(bet, event) : null;
      if (outcome) {
        projected += outcomeProfit(outcome, bet);
        projectedCount++;
      }
    }
  }

  return {
    inPlayCount: active.length,
    liveCount,
    atRisk,
    potentialPayout,
    projected,
    projectedCount,
  };
}
