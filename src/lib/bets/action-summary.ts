import { MULTI_LEG_BET_TYPES, type Bet } from "@/lib/bets/constants";
import { americanProfit } from "@/lib/bets/stats";
import {
  combineLegOutcomes,
  previewLegOutcome,
  previewSingleBetOutcome,
} from "@/lib/bets/grade";
import type { EspnEvent } from "@/lib/sports/espn";

export type DaySummary = {
  dateKey: string;

  // Bets already settled today (won/lost/push) — real, realized money.
  settledCount: number;
  wins: number;
  losses: number;
  pushes: number;
  settledProfit: number;

  // Bets still pending/live today.
  pendingCount: number; // linked game hasn't started
  liveCount: number; // linked game(s) currently in progress
  // Linked game(s) already final but the bet is still pending/live — it
  // should have auto-settled and didn't (an ungradable leg, a push, or a
  // matching miss). Kept out of liveCount/pendingCount so neither silently
  // absorbs it.
  needsReviewCount: number;
  atRisk: number;
  potentialPayout: number;
  // Live-preview P&L for in-play bets — "if every in-progress game ended
  // right now." Not a settlement; only ever a read on liveCount bets.
  liveProjected: number;
  projectedCount: number;

  // The headline number: real settled profit plus the live estimate.
  netProfit: number;
};

const SETTLED_STATUSES = new Set(["won", "lost", "push"]);
const ACTIVE_STATUSES = new Set(["pending", "live"]);

function betEvents(bet: Bet, liveStatuses: Map<string, EspnEvent>): (EspnEvent | undefined)[] {
  const legs = bet.bet_legs ?? [];
  if (MULTI_LEG_BET_TYPES.includes(bet.bet_type) && legs.length > 0) {
    return legs.map((leg) =>
      leg.external_event_id ? liveStatuses.get(leg.external_event_id) : undefined,
    );
  }
  return [bet.external_event_id ? liveStatuses.get(bet.external_event_id) : undefined];
}

// True once every linked game has gone final, regardless of whether the
// bet itself has been settled yet — see needsReviewCount above.
export function allLinkedGamesFinal(bet: Bet, liveStatuses: Map<string, EspnEvent>): boolean {
  const events = betEvents(bet, liveStatuses);
  return events.length > 0 && events.every((e) => e?.status.state === "post");
}

// The calendar date(s) a bet belongs to — each leg's own game date for a
// parlay/teaser (so a bet only counts as "today" if today is one of its
// games), or the single game date otherwise. Falls back to when the bet
// was placed for anything never linked to a real game.
function betDayKeys(bet: Bet): string[] {
  const legs = bet.bet_legs ?? [];
  if (MULTI_LEG_BET_TYPES.includes(bet.bet_type) && legs.length > 0) {
    return legs.map((leg) => (leg.event_start ?? bet.placed_at).slice(0, 10));
  }
  return [(bet.event_start ?? bet.placed_at).slice(0, 10)];
}

function outcomeProfit(outcome: "won" | "lost" | "push", bet: Bet): number {
  if (outcome === "won") return americanProfit(bet.odds, bet.stake);
  if (outcome === "lost") return -bet.stake;
  return 0;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// Summarizes "today's action": real settled results plus a live estimate
// for whatever's still in play, scoped to bets tied to today's games (by
// event date, not when they were placed) so a still-open future bet
// doesn't show up here and a past loss doesn't linger in it either.
export function computeDaySummary(
  bets: Bet[],
  liveStatuses: Map<string, EspnEvent>,
  date = todayKey(),
): DaySummary {
  const todays = bets.filter((b) => betDayKeys(b).includes(date));

  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let settledProfit = 0;
  let settledCount = 0;

  let pendingCount = 0;
  let liveCount = 0;
  let needsReviewCount = 0;
  let atRisk = 0;
  let potentialPayout = 0;
  let liveProjected = 0;
  let projectedCount = 0;

  for (const bet of todays) {
    if (SETTLED_STATUSES.has(bet.status)) {
      settledCount++;
      if (bet.status === "won") {
        wins++;
        settledProfit += americanProfit(bet.odds, bet.stake);
      } else if (bet.status === "lost") {
        losses++;
        settledProfit -= bet.stake;
      } else {
        pushes++;
      }
      continue;
    }

    if (!ACTIVE_STATUSES.has(bet.status)) continue; // e.g. cancelled

    atRisk += bet.stake;
    potentialPayout += bet.stake + americanProfit(bet.odds, bet.stake);

    const legs = bet.bet_legs ?? [];
    const isMultiLeg = MULTI_LEG_BET_TYPES.includes(bet.bet_type) && legs.length > 0;
    const events = betEvents(bet, liveStatuses);

    if (allLinkedGamesFinal(bet, liveStatuses)) {
      needsReviewCount++;
    } else if (events.some((e) => e?.status.state === "in")) {
      liveCount++;
    } else {
      pendingCount++;
    }

    let outcome: "won" | "lost" | "push" | null;
    if (isMultiLeg) {
      const previews = legs.map((leg, i) => {
        const event = events[i];
        return event ? previewLegOutcome(leg, event) : null;
      });
      outcome = combineLegOutcomes(previews);
    } else {
      const event = events[0];
      outcome = event ? previewSingleBetOutcome(bet, event) : null;
    }

    if (outcome) {
      liveProjected += outcomeProfit(outcome, bet);
      projectedCount++;
    }
  }

  return {
    dateKey: date,
    settledCount,
    wins,
    losses,
    pushes,
    settledProfit,
    pendingCount,
    liveCount,
    needsReviewCount,
    atRisk,
    potentialPayout,
    liveProjected,
    projectedCount,
    netProfit: settledProfit + liveProjected,
  };
}
