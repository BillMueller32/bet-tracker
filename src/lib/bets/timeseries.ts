import { americanProfit } from "@/lib/bets/stats";

export type TimeframeKey = "7d" | "30d" | "90d" | "season" | "all";

export const TIMEFRAMES: { value: TimeframeKey; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "season", label: "Season" },
  { value: "all", label: "All time" },
];

// Sports seasons roughly run Aug-Feb, so a bet placed in Jan still belongs
// to the season that kicked off the previous August.
function seasonStart(now: Date): Date {
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, 7, 1);
}

export function timeframeStartDate(key: TimeframeKey, now = new Date()): Date | null {
  switch (key) {
    case "7d":
      return new Date(now.getTime() - 7 * 86400000);
    case "30d":
      return new Date(now.getTime() - 30 * 86400000);
    case "90d":
      return new Date(now.getTime() - 90 * 86400000);
    case "season":
      return seasonStart(now);
    case "all":
      return null;
  }
}

type SettleableBet = {
  status: string;
  odds: number;
  stake: number;
  placed_at: string;
  settled_at: string | null;
};

function betDate(bet: SettleableBet): string {
  return (bet.settled_at ?? bet.placed_at).slice(0, 10);
}

function betProfit(bet: SettleableBet): number {
  if (bet.status === "won") return americanProfit(bet.odds, bet.stake);
  if (bet.status === "lost") return -bet.stake;
  return 0;
}

export type PLPoint = { date: string; profit: number; cumulative: number };

// One point per calendar day that had a settled bet, running cumulative
// P/L across the series. Pushes/cancelled contribute 0 but don't add a
// point on their own unless another decided bet also settled that day.
export function cumulativePLSeries(bets: SettleableBet[]): PLPoint[] {
  const decided = bets.filter(
    (b) => b.status === "won" || b.status === "lost" || b.status === "push",
  );
  const byDate = new Map<string, number>();
  for (const bet of decided) {
    const day = betDate(bet);
    byDate.set(day, (byDate.get(day) ?? 0) + betProfit(bet));
  }

  const days = Array.from(byDate.keys()).sort();
  let running = 0;
  return days.map((date) => {
    running += byDate.get(date)!;
    return { date, profit: byDate.get(date)!, cumulative: running };
  });
}

export type Streak = { type: "W" | "L" | null; count: number };

// Most recent unbroken run of wins or losses, newest-first. Pushes are
// skipped (neither extend nor break a streak), matching common convention.
export function currentStreak(bets: SettleableBet[]): Streak {
  const decided = [...bets]
    .filter((b) => b.status === "won" || b.status === "lost")
    .sort((a, b) => betDate(b).localeCompare(betDate(a)) || 0);

  if (decided.length === 0) return { type: null, count: 0 };

  const leadType = decided[0].status === "won" ? "W" : "L";
  let count = 0;
  for (const bet of decided) {
    const type = bet.status === "won" ? "W" : "L";
    if (type !== leadType) break;
    count++;
  }
  return { type: leadType, count };
}
