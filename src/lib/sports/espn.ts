import type { Sport } from "@/lib/bets/constants";

// ESPN's public (unofficial) site API. Free, no key, but only covers team
// sports with a standard scoreboard — golf/tennis/soccer aren't wired up
// yet since they don't fit this same date+matchup shape.
const ESPN_PATH_BY_SPORT: Partial<Record<Sport, string>> = {
  nfl: "football/nfl",
  nba: "basketball/nba",
  mlb: "baseball/mlb",
  nhl: "hockey/nhl",
  ncaaf: "football/college-football",
  ncaab: "basketball/mens-college-basketball",
};

export function sportSupportsGameSearch(sport: string): boolean {
  return sport in ESPN_PATH_BY_SPORT;
}

export type EspnEventStatus = {
  // "pre" (not started), "in" (live), "post" (final).
  state: "pre" | "in" | "post" | string;
  // Human-readable, e.g. "Final", "8:45 - 3rd Qtr", "Sun, Sep 21 1:00 PM".
  detail: string;
};

export type EspnEvent = {
  id: string;
  name: string;
  shortName: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  // Kept alongside the display names since bet slips usually show
  // abbreviations (e.g. "TB", "PHI") rather than full team names.
  homeNames: string[];
  awayNames: string[];
  homeScore?: string;
  awayScore?: string;
  status: EspnEventStatus;
};

type EspnCompetitor = {
  homeAway: "home" | "away";
  score?: string;
  team?: {
    displayName?: string;
    shortDisplayName?: string;
    abbreviation?: string;
  };
};

type EspnApiEvent = {
  id: string;
  name: string;
  shortName: string;
  date: string;
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    status?: {
      type?: { state?: string; detail?: string; shortDetail?: string };
    };
  }>;
};

export async function searchEspnEvents(
  sport: string,
  dateISO: string,
): Promise<EspnEvent[]> {
  const path = ESPN_PATH_BY_SPORT[sport as Sport];
  if (!path) return [];

  const yyyymmdd = dateISO.replaceAll("-", "");
  const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard?dates=${yyyymmdd}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`ESPN request failed (${res.status})`);
  }

  const data = (await res.json()) as { events?: EspnApiEvent[] };

  return (data.events ?? []).map((event) => {
    const competition = event.competitions?.[0];
    const competitors = competition?.competitors ?? [];
    const home = competitors.find((c) => c.homeAway === "home");
    const away = competitors.find((c) => c.homeAway === "away");
    const statusType = competition?.status?.type;

    return {
      id: event.id,
      name: event.name,
      shortName: event.shortName,
      date: event.date,
      homeTeam: home?.team?.displayName ?? "",
      awayTeam: away?.team?.displayName ?? "",
      homeNames: [
        home?.team?.displayName,
        home?.team?.shortDisplayName,
        home?.team?.abbreviation,
      ].filter((n): n is string => !!n),
      awayNames: [
        away?.team?.displayName,
        away?.team?.shortDisplayName,
        away?.team?.abbreviation,
      ].filter((n): n is string => !!n),
      homeScore: home?.score,
      awayScore: away?.score,
      status: {
        state: statusType?.state ?? "pre",
        detail: statusType?.shortDetail ?? statusType?.detail ?? "",
      },
    };
  });
}

export function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function nameHits(names: string[], hint: string): boolean {
  return names.some((n) => n && (n.includes(hint) || hint.includes(n)));
}

// Which side of the matchup a team hint refers to, if it clearly matches
// one — used for grading, where guessing wrong would misgrade a bet. A
// hint that doesn't match either team (e.g. a player's name) returns
// null rather than a guess.
export function sideOfEvent(
  event: EspnEvent,
  hint: string,
): "home" | "away" | null {
  const n = normalize(hint);
  if (!n) return null;

  const homeNorm = event.homeNames.map(normalize);
  const awayNorm = event.awayNames.map(normalize);
  const isHome = nameHits(homeNorm, n);
  const isAway = nameHits(awayNorm, n);

  if (isHome && !isAway) return "home";
  if (isAway && !isHome) return "away";
  return null;
}

// Best-effort match against whatever team/player text an AI extraction or
// a bet slip's own wording gives us (often an abbreviation, sometimes a
// full name, casing/punctuation all over the place).
export function findBestMatch(
  events: EspnEvent[],
  hints: string[],
): EspnEvent | null {
  const normalizedHints = hints.map(normalize).filter(Boolean);
  if (normalizedHints.length === 0) return null;

  let best: { event: EspnEvent; score: number } | null = null;

  for (const event of events) {
    const homeNorm = event.homeNames.map(normalize);
    const awayNorm = event.awayNames.map(normalize);
    let score = 0;

    for (const hint of normalizedHints) {
      const hits = (names: string[]) =>
        names.some((n) => n && (n.includes(hint) || hint.includes(n)));
      if (hits(homeNorm)) score++;
      if (hits(awayNorm)) score++;
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { event, score };
    }
  }

  return best?.event ?? null;
}
