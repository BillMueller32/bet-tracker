// American odds -> implied win probability (0-1), the standard
// conversion. Needed because American odds don't average meaningfully on
// their own — -110 and +150 averaging to +20 is arithmetic on the wrong
// scale. Probability is the scale that actually averages.
export function oddsToImpliedProbability(odds: number): number {
  return odds > 0 ? 100 / (odds + 100) : -odds / (-odds + 100);
}

// Inverse of the above, for displaying an average back in the American
// format bettors actually read.
export function impliedProbabilityToOdds(prob: number): number {
  if (prob <= 0 || prob >= 1) return 0;
  return prob <= 0.5
    ? Math.round((100 * (1 - prob)) / prob)
    : Math.round((-100 * prob) / (1 - prob));
}

// Averages a set of American odds by converting to implied probability
// first, then back — not by averaging the American numbers directly.
export function averageOdds(oddsList: number[]): number | null {
  if (oddsList.length === 0) return null;
  const avgProb =
    oddsList.reduce((sum, o) => sum + oddsToImpliedProbability(o), 0) / oddsList.length;
  return impliedProbabilityToOdds(avgProb);
}

const ODDS_RANGES: { key: string; label: string; test: (odds: number) => boolean }[] = [
  { key: "heavy_fav", label: "≤ -200 (heavy fav)", test: (o) => o <= -200 },
  { key: "mod_fav", label: "-199 to -110", test: (o) => o > -200 && o <= -110 },
  { key: "pick_em", label: "-109 to +100", test: (o) => o > -110 && o <= 100 },
  { key: "mod_dog", label: "+101 to +200", test: (o) => o > 100 && o <= 200 },
  { key: "big_dog", label: "> +200 (big dog)", test: (o) => o > 200 },
];

export function oddsRangeKey(odds: number): { key: string; label: string } {
  const range = ODDS_RANGES.find((r) => r.test(odds)) ?? ODDS_RANGES[2];
  return { key: range.key, label: range.label };
}

const WEEKDAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  weekday: "short",
});

export function dayOfWeekKey(iso: string): { key: string; label: string } {
  const label = weekdayFormatter.format(new Date(iso));
  return { key: label, label };
}

export function sortByWeekday<T extends { key: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => WEEKDAY_ORDER.indexOf(a.key) - WEEKDAY_ORDER.indexOf(b.key),
  );
}
