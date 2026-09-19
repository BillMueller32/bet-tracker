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

export type EspnEvent = {
  id: string;
  name: string;
  shortName: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
};

type EspnCompetitor = {
  homeAway: "home" | "away";
  team?: { displayName?: string };
};

type EspnApiEvent = {
  id: string;
  name: string;
  shortName: string;
  date: string;
  competitions?: Array<{ competitors?: EspnCompetitor[] }>;
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
    const competitors = event.competitions?.[0]?.competitors ?? [];
    const home = competitors.find((c) => c.homeAway === "home");
    const away = competitors.find((c) => c.homeAway === "away");

    return {
      id: event.id,
      name: event.name,
      shortName: event.shortName,
      date: event.date,
      homeTeam: home?.team?.displayName ?? "",
      awayTeam: away?.team?.displayName ?? "",
    };
  });
}
