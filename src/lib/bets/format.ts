export function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

const SPORT_EMOJI: Record<string, string> = {
  nfl: "🏈",
  ncaaf: "🏈",
  nba: "🏀",
  ncaab: "🏀",
  mlb: "⚾",
  nhl: "🏒",
  golf: "⛳",
  tennis: "🎾",
  soccer: "⚽",
};

export function sportEmoji(sport: string): string {
  return SPORT_EMOJI[sport] ?? "🎲";
}

// Bookie/screenshot text often arrives as a raw, ALL-CAPS dump (extraction
// preserves it verbatim rather than guessing at proper casing). Converts
// to Title Case while leaving short all-caps tokens alone, since those
// are almost always real abbreviations (TB, PHI, CFB) rather than words
// that happen to be shouted.
export function toTitleCase(text: string): string {
  return text.replace(/[A-Za-z]+/g, (word) => {
    const isAllUpper = word === word.toUpperCase();
    const isAllLower = word === word.toLowerCase();
    if (word.length <= 4 && isAllUpper) return word;
    if (!isAllUpper && !isAllLower) return word; // already intentionally mixed-case
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
  });
}

// Raw bookie text often jams a line and odds together with no space
// (e.g. "-2+105", "-18-110", "-8½-115"). Splits them apart for
// readability without needing to understand which number means what.
export function cleanBetText(text: string): string {
  return text.replace(/([0-9)½])([+-])/g, "$1 $2");
}

// Strips a leading bracketed sport tag some bookies prefix event names
// with (e.g. "[CFB] - Alabama" -> "Alabama") — noise for a card title,
// though still useful for matching, so this is display-only.
export function cleanEventName(text: string): string {
  const stripped = text.replace(/^\[[^\]]*\]\s*-?\s*/, "").trim();
  return toTitleCase(stripped || text);
}

// Avoids printing the team name twice ("TB Buccaneers — TB Buccaneers
// -2 +105") when the selection text already includes it.
export function displayPick(
  participant: string | null,
  selection: string,
): string {
  const cleanSelection = cleanBetText(toTitleCase(selection));
  if (!participant) return cleanSelection;

  const cleanParticipant = toTitleCase(participant);
  if (cleanSelection.toLowerCase().startsWith(cleanParticipant.toLowerCase())) {
    return cleanSelection;
  }
  return `${cleanParticipant} — ${cleanSelection}`;
}

export function formatStake(stake: number): string {
  return `$${stake.toFixed(2)}`;
}

const startTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function formatStartTime(iso: string): string {
  return startTimeFormatter.format(new Date(iso));
}

export function formatSignedDollars(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function profitTextClass(value: number): string {
  if (value > 0) return "text-green-400";
  if (value < 0) return "text-red-400";
  return "text-neutral-400";
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-neutral-800 text-neutral-300",
  live: "bg-amber-950 text-amber-300",
  won: "bg-green-950 text-green-300",
  lost: "bg-red-950 text-red-300",
  push: "bg-blue-950 text-blue-300",
  cancelled: "bg-neutral-900 text-neutral-500",
};

export function statusBadgeClass(status: string): string {
  return STATUS_STYLES[status] ?? STATUS_STYLES.pending;
}
