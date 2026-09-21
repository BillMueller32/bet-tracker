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
  { value: "teaser", label: "Teaser" },
  { value: "other", label: "Other" },
] as const;

export type BetType = (typeof BET_TYPES)[number]["value"];

// Bundle multiple picks (each in its own bet_legs row) under one stake/payout.
export const MULTI_LEG_BET_TYPES: BetType[] = ["parlay", "teaser"];

const TEAM_SPORT_BET_TYPES: BetType[] = [
  "moneyline",
  "spread",
  "total",
  "player_prop",
  "team_prop",
  "parlay",
  "teaser",
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

// Standard teaser point offerings, in the increments books actually use.
export const TEASER_POINT_OPTIONS = Array.from(
  { length: 10 },
  (_, i) => 6 + i * 0.5,
);

export const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "live", label: "Live" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "push", label: "Push" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export type BetStatus = (typeof STATUSES)[number]["value"];

export type BetLeg = {
  id?: string;
  sport: Sport | string;
  event_name: string;
  event_start?: string | null;
  external_event_id?: string | null;
  participant: string | null;
  selection: string;
  line: number | null;
  odds: number | null;
};

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
  screenshot_path?: string | null;
  // Only meaningful when bet_type is 'teaser': how many points each leg's
  // line was adjusted by (e.g. 6, 7, 10).
  teaser_points?: number | null;
  sportsbook?: string | null;
  is_free_bet?: boolean;
  cash_out_amount?: number | null;
  // Realized profit override — see migration 0005_bet_extras.sql. When
  // set, this is what actually happened financially; odds x stake is
  // only ever a fallback.
  actual_profit?: number | null;
  bet_legs?: BetLeg[];
};

export type UserSettings = {
  bankroll: number | null;
  unit_size: number | null;
};
