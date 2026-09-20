import { sideOfEvent, type EspnEvent } from "@/lib/sports/espn";

export type GradeOutcome = "won" | "lost" | "push";

export type GradeResult = {
  outcome: GradeOutcome;
  detail: string;
};

type GradableFields = {
  participant: string | null;
  event_name: string;
  selection: string;
  line: number | null;
};

// Prefer participant (should reliably be just the team's own name), but
// fall back to event_name for older/manual entries that never got a
// participant filled in — normalize() already strips bracketed noise
// like "[CFB] -" so this still matches cleanly.
function teamHint(bet: GradableFields): string {
  return bet.participant || bet.event_name;
}

const MECHANICAL_TYPES = new Set(["moneyline", "spread", "total"]);

function finalScores(event: EspnEvent): { home: number; away: number } | null {
  const home = Number(event.homeScore);
  const away = Number(event.awayScore);
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
  return { home, away };
}

function scoreDetail(event: EspnEvent): string {
  return `Final: ${event.awayTeam} ${event.awayScore}, ${event.homeTeam} ${event.homeScore}`;
}

function gradeMoneyline(
  side: "home" | "away",
  event: EspnEvent,
): GradeOutcome | null {
  const scores = finalScores(event);
  if (!scores) return null;
  if (scores.home === scores.away) return "push";
  const pick = side === "home" ? scores.home : scores.away;
  const opp = side === "home" ? scores.away : scores.home;
  return pick > opp ? "won" : "lost";
}

function gradeSpread(
  side: "home" | "away",
  line: number,
  event: EspnEvent,
): GradeOutcome | null {
  const scores = finalScores(event);
  if (!scores) return null;
  const pick = side === "home" ? scores.home : scores.away;
  const opp = side === "home" ? scores.away : scores.home;
  const margin = pick + line - opp;
  if (margin > 0) return "won";
  if (margin < 0) return "lost";
  return "push";
}

function gradeTotal(
  isOver: boolean,
  line: number,
  event: EspnEvent,
): GradeOutcome | null {
  const scores = finalScores(event);
  if (!scores) return null;
  const total = scores.home + scores.away;
  if (total === line) return "push";
  return total > line === isOver ? "won" : "lost";
}

function computeSingleBetOutcome(
  bet: GradableFields & { bet_type: string },
  event: EspnEvent,
): GradeOutcome | null {
  if (!MECHANICAL_TYPES.has(bet.bet_type)) return null;

  if (bet.bet_type === "total") {
    if (bet.line === null) return null;
    const isOver = /over/i.test(bet.selection);
    const isUnder = /under/i.test(bet.selection);
    if (!isOver && !isUnder) return null;
    return gradeTotal(isOver, bet.line, event);
  }

  const side = sideOfEvent(event, teamHint(bet));
  if (!side) return null;

  if (bet.bet_type === "moneyline") return gradeMoneyline(side, event);

  if (bet.line === null) return null;
  return gradeSpread(side, bet.line, event);
}

// Explicit bet_type (moneyline/spread/total) is trusted directly — never
// auto-grades player_prop/team_prop/outright/match/other, since those
// need real stats, not just a final score.
export function gradeSingleBet(
  bet: GradableFields & { bet_type: string },
  event: EspnEvent,
): GradeResult | null {
  if (event.status.state !== "post") return null;
  const outcome = computeSingleBetOutcome(bet, event);
  return outcome ? { outcome, detail: scoreDetail(event) } : null;
}

// Same line-covering math as gradeSingleBet, but for a game that hasn't
// gone final yet — "if this game ended right now." Used for an in-progress
// projection, never for auto-settling a bet. ESPN reports "0" scores for
// games that haven't started, so a "pre" event is explicitly excluded
// rather than relying on the score fields alone.
export function previewSingleBetOutcome(
  bet: GradableFields & { bet_type: string },
  event: EspnEvent,
): GradeOutcome | null {
  if (event.status.state === "pre") return null;
  return computeSingleBetOutcome(bet, event);
}

// Parlay/teaser legs have no bet_type of their own, so the type is
// inferred from what's actually stored. The side-match is a required
// safety gate, not just a lookup: a leg whose participant doesn't clearly
// match one of the two real teams (e.g. it names a player instead) is
// treated as ungradable rather than guessed at, since misreading a
// player prop as a team total/spread would silently misgrade the bet.
function computeLegOutcome(leg: GradableFields, event: EspnEvent): GradeOutcome | null {
  const side = sideOfEvent(event, teamHint(leg));
  if (!side) return null;

  if (leg.line === null) return gradeMoneyline(side, event);

  const isOver = /over/i.test(leg.selection);
  const isUnder = /under/i.test(leg.selection);
  return isOver || isUnder
    ? gradeTotal(isOver, leg.line, event)
    : gradeSpread(side, leg.line, event);
}

export function gradeLeg(
  leg: GradableFields,
  event: EspnEvent,
): GradeResult | null {
  if (event.status.state !== "post") return null;
  const outcome = computeLegOutcome(leg, event);
  return outcome ? { outcome, detail: scoreDetail(event) } : null;
}

// Live counterpart of gradeLeg — see previewSingleBetOutcome.
export function previewLegOutcome(
  leg: GradableFields,
  event: EspnEvent,
): GradeOutcome | null {
  if (event.status.state === "pre") return null;
  return computeLegOutcome(leg, event);
}

// Combines a parlay/teaser's leg outcomes into one bet-level result.
// Any confirmed loss settles the whole bet as lost regardless of other
// legs. A push (with no loss) is left for manual review rather than
// guessed, since how a push adjusts the payout is book-specific. Any
// leg that couldn't be graded yet blocks settling the whole bet.
export function combineLegOutcomes(
  outcomes: (GradeOutcome | null)[],
): GradeOutcome | null {
  if (outcomes.some((o) => o === "lost")) return "lost";
  if (outcomes.some((o) => o === null)) return null;
  if (outcomes.some((o) => o === "push")) return null;
  return "won";
}
