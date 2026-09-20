import { sideOfEvent, type EspnEvent } from "@/lib/sports/espn";

export type GradeOutcome = "won" | "lost" | "push";

export type GradeResult = {
  outcome: GradeOutcome;
  detail: string;
};

type GradableFields = {
  participant: string | null;
  selection: string;
  line: number | null;
};

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

// Explicit bet_type (moneyline/spread/total) is trusted directly — never
// auto-grades player_prop/team_prop/outright/match/other, since those
// need real stats, not just a final score.
export function gradeSingleBet(
  bet: GradableFields & { bet_type: string },
  event: EspnEvent,
): GradeResult | null {
  if (event.status.state !== "post") return null;
  if (!MECHANICAL_TYPES.has(bet.bet_type)) return null;

  const detail = scoreDetail(event);

  if (bet.bet_type === "total") {
    if (bet.line === null) return null;
    const isOver = /over/i.test(bet.selection);
    const isUnder = /under/i.test(bet.selection);
    if (!isOver && !isUnder) return null;
    const outcome = gradeTotal(isOver, bet.line, event);
    return outcome ? { outcome, detail } : null;
  }

  const side = sideOfEvent(event, bet.participant ?? "");
  if (!side) return null;

  if (bet.bet_type === "moneyline") {
    const outcome = gradeMoneyline(side, event);
    return outcome ? { outcome, detail } : null;
  }

  if (bet.line === null) return null;
  const outcome = gradeSpread(side, bet.line, event);
  return outcome ? { outcome, detail } : null;
}

// Parlay/teaser legs have no bet_type of their own, so the type is
// inferred from what's actually stored. The side-match is a required
// safety gate, not just a lookup: a leg whose participant doesn't clearly
// match one of the two real teams (e.g. it names a player instead) is
// treated as ungradable rather than guessed at, since misreading a
// player prop as a team total/spread would silently misgrade the bet.
export function gradeLeg(
  leg: GradableFields,
  event: EspnEvent,
): GradeResult | null {
  if (event.status.state !== "post") return null;

  const side = sideOfEvent(event, leg.participant ?? "");
  if (!side) return null;

  const detail = scoreDetail(event);

  if (leg.line === null) {
    const outcome = gradeMoneyline(side, event);
    return outcome ? { outcome, detail } : null;
  }

  const isOver = /over/i.test(leg.selection);
  const isUnder = /under/i.test(leg.selection);
  const outcome = isOver || isUnder
    ? gradeTotal(isOver, leg.line, event)
    : gradeSpread(side, leg.line, event);

  return outcome ? { outcome, detail } : null;
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
