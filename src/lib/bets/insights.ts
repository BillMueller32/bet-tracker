import { SPORTS, BET_TYPES } from "@/lib/bets/constants";
import { americanProfit } from "@/lib/bets/stats";
import { formatPercent, formatSignedDollars, formatStake } from "@/lib/bets/format";

type InsightBet = {
  sport: string;
  bet_type: string;
  status: string;
  odds: number;
  stake: number;
  placed_at: string;
  settled_at: string | null;
};

export type Insight = {
  icon: string;
  title: string;
  headline: string;
  detail: string;
  tone: "positive" | "negative" | "neutral";
};

const MIN_MARKET_SAMPLE = 5;
const MIN_TREND_SAMPLE = 5;
const MIN_BEHAVIOR_SAMPLE = 10;

function sportLabel(value: string): string {
  return SPORTS.find((s) => s.value === value)?.label ?? value;
}

function betTypeLabel(value: string): string {
  return BET_TYPES.find((t) => t.value === value)?.label ?? value;
}

function betProfit(bet: InsightBet): number {
  if (bet.status === "won") return americanProfit(bet.odds, bet.stake);
  if (bet.status === "lost") return -bet.stake;
  return 0;
}

function sortByDate(bets: InsightBet[]): InsightBet[] {
  return [...bets].sort(
    (a, b) =>
      new Date(a.settled_at ?? a.placed_at).getTime() -
      new Date(b.settled_at ?? b.placed_at).getTime(),
  );
}

type MarketRow = {
  key: string;
  label: string;
  count: number;
  staked: number;
  profit: number;
};

function marketBreakdown(decided: InsightBet[]): MarketRow[] {
  const rows = new Map<string, MarketRow>();
  for (const bet of decided) {
    const key = `${bet.sport}:${bet.bet_type}`;
    const label = `${sportLabel(bet.sport)} ${betTypeLabel(bet.bet_type)}`;
    if (!rows.has(key)) rows.set(key, { key, label, count: 0, staked: 0, profit: 0 });
    const row = rows.get(key)!;
    row.count++;
    row.staked += bet.stake;
    row.profit += betProfit(bet);
  }
  return Array.from(rows.values());
}

function strongestMarket(decided: InsightBet[]): Insight | null {
  const rows = marketBreakdown(decided).filter((r) => r.count >= MIN_MARKET_SAMPLE);
  if (rows.length === 0) return null;
  const best = rows.reduce((a, b) => (b.profit / b.staked > a.profit / a.staked ? b : a));
  const roi = best.profit / best.staked;
  if (roi <= 0) return null;
  return {
    icon: "🔥",
    title: "Your strongest market",
    headline: best.label,
    detail: `${best.count} bets · ${formatPercent(roi)} ROI`,
    tone: "positive",
  };
}

function biggestLeak(decided: InsightBet[]): Insight | null {
  const rows = marketBreakdown(decided).filter((r) => r.count >= MIN_MARKET_SAMPLE);
  if (rows.length === 0) return null;
  const worst = rows.reduce((a, b) => (b.profit / b.staked < a.profit / a.staked ? b : a));
  const roi = worst.profit / worst.staked;
  if (roi >= 0) return null;
  return {
    icon: "⚠️",
    title: "Biggest leak",
    headline: worst.label,
    detail: `${worst.count} bets · ${formatPercent(roi)} ROI`,
    tone: "negative",
  };
}

function recentTrend(decided: InsightBet[]): Insight | null {
  if (decided.length < MIN_TREND_SAMPLE) return null;
  const sorted = sortByDate(decided);
  const window = sorted.slice(-30);
  const profit = window.reduce((sum, b) => sum + betProfit(b), 0);
  return {
    icon: "📈",
    title: "Recent trend",
    headline: `${formatSignedDollars(profit)} over your last ${window.length} bets`,
    detail:
      profit >= 0
        ? "Your recent results are net positive."
        : "Your recent results are net negative.",
    tone: profit >= 0 ? "positive" : "negative",
  };
}

function stakeTrend(bets: InsightBet[]): Insight | null {
  if (bets.length < MIN_BEHAVIOR_SAMPLE) return null;
  const sorted = sortByDate(bets);
  const windowSize = Math.min(20, Math.floor(sorted.length / 2));
  if (windowSize < 3) return null;

  const recent = sorted.slice(-windowSize);
  const prior = sorted.slice(-windowSize * 2, -windowSize);
  if (prior.length === 0) return null;

  const avg = (rows: InsightBet[]) => rows.reduce((sum, b) => sum + b.stake, 0) / rows.length;
  const recentAvg = avg(recent);
  const priorAvg = avg(prior);
  if (priorAvg === 0) return null;

  const change = (recentAvg - priorAvg) / priorAvg;
  if (Math.abs(change) < 0.1) return null;

  return {
    icon: "💰",
    title: "Betting behavior",
    headline: `Average stake ${change > 0 ? "up" : "down"} ${formatPercent(Math.abs(change))}`,
    detail: `${formatStake(priorAvg)} → ${formatStake(recentAvg)} over your last ${windowSize * 2} bets`,
    tone: "neutral",
  };
}

export function generateInsights(bets: InsightBet[]): Insight[] {
  const decided = bets.filter((b) => b.status === "won" || b.status === "lost");
  const insights = [strongestMarket(decided), biggestLeak(decided), recentTrend(decided), stakeTrend(bets)];
  return insights.filter((i): i is Insight => i !== null);
}
