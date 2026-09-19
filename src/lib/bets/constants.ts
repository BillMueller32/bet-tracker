export const SPORTS = [
  { value: "nfl", label: "NFL" },
  { value: "nba", label: "NBA" },
  { value: "mlb", label: "MLB" },
  { value: "nhl", label: "NHL" },
  { value: "ncaaf", label: "NCAAF" },
  { value: "ncaab", label: "NCAAB" },
  { value: "golf", label: "Golf" },
  { value: "tennis", label: "Tennis" },
  { value: "soccer", label: "Soccer" },
  { value: "other", label: "Other" },
] as const;

export type Sport = (typeof SPORTS)[number]["value"];

export const BET_TYPES = [
  { value: "moneyline", label: "Moneyline" },
  { value: "spread", label: "Spread" },
  { value: "total", label: "Total (Over/Under)" },
  { value: "player_prop", label: "Player prop" },
  { value: "team_prop", label: "Team prop" },
  { value: "outright", label: "Outright (e.g. tournament winner)" },
  { value: "match", label: "Match winner" },
  { value: "parlay", label: "Parlay" },
  { value: "other", label: "Other" },
] as const;

export type BetType = (typeof BET_TYPES)[number]["value"];

const TEAM_SPORT_BET_TYPES: BetType[] = [
  "moneyline",
  "spread",
  "total",
  "player_prop",
  "team_prop",
  "parlay",
  "other",
];

export const BET_TYPES_BY_SPORT: Record<Sport, BetType[]> = {
  nfl: TEAM_SPORT_BET_TYPES,
  nba: TEAM_SPORT_BET_TYPES,
  mlb: TEAM_SPORT_BET_TYPES,
  nhl: TEAM_SPORT_BET_TYPES,
  ncaaf: TEAM_SPORT_BET_TYPES,
  ncaab: TEAM_SPORT_BET_TYPES,
  soccer: TEAM_SPORT_BET_TYPES,
  golf: ["outright", "player_prop", "other"],
  tennis: ["match", "player_prop", "other"],
  other: BET_TYPES.map((t) => t.value),
};

export const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "live", label: "Live" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "push", label: "Push" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export type BetStatus = (typeof STATUSES)[number]["value"];

export type Bet = {
  id: string;
  created_at: string;
  placed_at: string;
  sport: Sport;
  event_name: string;
  event_start: string | null;
  external_event_id: string | null;
  bet_type: BetType;
  participant: string | null;
  selection: string;
  line: number | null;
  odds: number;
  stake: number;
  status: BetStatus;
  result_value: string | null;
  settled_at: string | null;
  notes: string | null;
};
