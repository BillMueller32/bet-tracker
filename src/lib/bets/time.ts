// Every "what day is this" decision in the app should go through here.
// Pacific is the user's local timezone; bucketing by UTC instead flips
// "today" at 5pm PDT / 4pm PST and files evening games under the wrong day.
const APP_TIME_ZONE = "America/Los_Angeles";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// YYYY-MM-DD for the given instant, in the app's local timezone (en-CA
// formats as YYYY-MM-DD natively, avoiding manual part-reassembly).
export function localDayKey(iso: string, now = new Date()): string {
  const date = iso ? new Date(iso) : now;
  return dayKeyFormatter.format(date);
}

export function todayKey(now = new Date()): string {
  return dayKeyFormatter.format(now);
}

// Rough scheduled game length by sport, used only to approximate when an
// auto-graded bet's linked game actually ended (ESPN's scoreboard exposes
// a start time and a live/final state, but no explicit "ended at"
// timestamp). Deliberately generous — a settled_at that's a few minutes
// late is fine for day-bucketing and the P&L chart; what matters is not
// using "whenever the page happened to load" (which can be hours later).
const GAME_DURATION_MINUTES: Record<string, number> = {
  nfl: 210,
  ncaaf: 210,
  nba: 150,
  ncaab: 130,
  mlb: 180,
  nhl: 150,
  soccer: 120,
};

export function estimateGameEnd(eventStartIso: string, sport: string): Date {
  const minutes = GAME_DURATION_MINUTES[sport] ?? 180;
  return new Date(new Date(eventStartIso).getTime() + minutes * 60_000);
}
