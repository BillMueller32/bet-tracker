import { MULTI_LEG_BET_TYPES, type Bet } from "@/lib/bets/constants";
import { americanProfit } from "@/lib/bets/stats";
import {
  classifyBet,
  type BetBucket,
} from "@/lib/bets/action-summary";
import {
  combineLegOutcomes,
  previewLegOutcome,
  previewSingleBetOutcome,
} from "@/lib/bets/grade";
import { localDayKey, todayKey } from "@/lib/bets/time";
import type { EspnEvent } from "@/lib/sports/espn";

const ACTIVE_STATUSES = new Set(["pending", "live"]);

export type OpenActionDay = {
  dateKey: string;
  label: string;
  atRisk: number;
  potentialPayout: number;
  betCount: number;
};

export type ConcentrationWarning = {
  eventId: string;
  label: string;
  betCount: number;
  atRisk: number;
};

export type OpenAction = {
  betCount: number;
  atRisk: number;
  // Best case: every open bet wins. Worst case: every open bet loses
  // (always -atRisk). Neither is a prediction — they're the outer bounds.
  bestCase: number;
  worstCase: number;
  // Settled-today profit plus a live estimate for bets currently in
  // progress. Bets whose games haven't started yet contribute nothing
  // here (no signal to estimate from) — they only show up in best/worst.
  expectedCase: number;
  pendingCount: number;
  liveCount: number;
  needsReviewCount: number;
  days: OpenActionDay[];
  concentrationWarnings: ConcentrationWarning[];
  // atRisk as a share of bankroll, when the user has set one.
  bankrollPct: number | null;
};

function dayLabel(dateKey: string): string {
  const today = todayKey();
  if (dateKey === today) return "Today";
  const tomorrow = localDayKey(new Date(Date.now() + 86_400_000).toISOString());
  if (dateKey === tomorrow) return "Tomorrow";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Which calendar day (local time) an open bet's exposure belongs under —
// the earliest still-relevant game date, so a same-day parlay groups
// under today and a future-dated bet groups under its own day rather
// than under when it was placed.
function openBetDayKey(bet: Bet): string {
  const legs = bet.bet_legs ?? [];
  const starts =
    MULTI_LEG_BET_TYPES.includes(bet.bet_type) && legs.length > 0
      ? legs.map((leg) => leg.event_start).filter((s): s is string => !!s)
      : bet.event_start
        ? [bet.event_start]
        : [];

  if (starts.length === 0) return localDayKey(bet.placed_at);
  const earliest = starts.reduce((a, b) => (b < a ? b : a));
  return localDayKey(earliest);
}

function betEvents(bet: Bet, liveStatuses: Map<string, EspnEvent>): (EspnEvent | undefined)[] {
  const legs = bet.bet_legs ?? [];
  if (MULTI_LEG_BET_TYPES.includes(bet.bet_type) && legs.length > 0) {
    return legs.map((leg) =>
      leg.external_event_id ? liveStatuses.get(leg.external_event_id) : undefined,
    );
  }
  return [bet.external_event_id ? liveStatuses.get(bet.external_event_id) : undefined];
}

function projectOutcome(
  bet: Bet,
  liveStatuses: Map<string, EspnEvent>,
): "won" | "lost" | "push" | null {
  const legs = bet.bet_legs ?? [];
  const isMultiLeg = MULTI_LEG_BET_TYPES.includes(bet.bet_type) && legs.length > 0;
  const events = betEvents(bet, liveStatuses);

  if (isMultiLeg) {
    const previews = legs.map((leg, i) => {
      const event = events[i];
      return event ? previewLegOutcome(leg, event) : null;
    });
    return combineLegOutcomes(previews);
  }
  const event = events[0];
  return event ? previewSingleBetOutcome(bet, event) : null;
}

function projectedProfit(outcome: "won" | "lost" | "push", bet: Bet): number {
  if (outcome === "won") return americanProfit(bet.odds, bet.stake);
  if (outcome === "lost") return -bet.stake;
  return 0;
}

// Every external_event_id touched by an open bet, whether it's the bet's
// own event or one of a parlay's legs — used to flag when several open
// bets ride on the same game. Bets never linked to a real game (no
// external_event_id) can't be checked this way and are simply skipped;
// that's a known gap, not a false negative worth guessing around.
function eventIdsTouched(bet: Bet): { id: string; label: string }[] {
  const legs = bet.bet_legs ?? [];
  if (MULTI_LEG_BET_TYPES.includes(bet.bet_type) && legs.length > 0) {
    return legs
      .filter((leg) => leg.external_event_id)
      .map((leg) => ({ id: leg.external_event_id!, label: leg.event_name }));
  }
  return bet.external_event_id
    ? [{ id: bet.external_event_id, label: bet.event_name }]
    : [];
}

export function computeOpenAction(
  bets: Bet[],
  liveStatuses: Map<string, EspnEvent>,
  bankroll: number | null = null,
): OpenAction {
  const open = bets.filter((b) => ACTIVE_STATUSES.has(b.status));

  let atRisk = 0;
  let bestCase = 0;
  let expectedCase = 0;
  let pendingCount = 0;
  let liveCount = 0;
  let needsReviewCount = 0;

  const dayTotals = new Map<string, OpenActionDay>();
  const eventTotals = new Map<
    string,
    { label: string; betIds: Set<string>; atRisk: number }
  >();

  for (const bet of open) {
    atRisk += bet.stake;
    bestCase += americanProfit(bet.odds, bet.stake);

    const bucket: BetBucket = classifyBet(bet, liveStatuses);
    if (bucket === "needsReview") needsReviewCount++;
    else if (bucket === "live") liveCount++;
    else pendingCount++;

    if (bucket === "live" || bucket === "needsReview") {
      const outcome = projectOutcome(bet, liveStatuses);
      if (outcome) expectedCase += projectedProfit(outcome, bet);
    }

    const dateKey = openBetDayKey(bet);
    const day =
      dayTotals.get(dateKey) ??
      { dateKey, label: dayLabel(dateKey), atRisk: 0, potentialPayout: 0, betCount: 0 };
    day.atRisk += bet.stake;
    day.potentialPayout += bet.stake + americanProfit(bet.odds, bet.stake);
    day.betCount++;
    dayTotals.set(dateKey, day);

    for (const { id, label } of eventIdsTouched(bet)) {
      const entry =
        eventTotals.get(id) ?? { label, betIds: new Set<string>(), atRisk: 0 };
      entry.betIds.add(bet.id);
      entry.atRisk += bet.stake;
      eventTotals.set(id, entry);
    }
  }

  const days = Array.from(dayTotals.values()).sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey),
  );

  const concentrationWarnings: ConcentrationWarning[] = Array.from(
    eventTotals.entries(),
  )
    .filter(([, v]) => v.betIds.size > 1)
    .map(([eventId, v]) => ({
      eventId,
      label: v.label,
      betCount: v.betIds.size,
      atRisk: v.atRisk,
    }))
    .sort((a, b) => b.atRisk - a.atRisk);

  return {
    betCount: open.length,
    atRisk,
    bestCase,
    worstCase: -atRisk,
    expectedCase,
    pendingCount,
    liveCount,
    needsReviewCount,
    days,
    concentrationWarnings,
    bankrollPct: bankroll && bankroll > 0 ? atRisk / bankroll : null,
  };
}
