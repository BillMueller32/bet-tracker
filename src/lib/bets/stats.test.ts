import { describe, expect, it } from "vitest";
import { americanProfit, betProfit, overallStats, groupStats } from "@/lib/bets/stats";

describe("americanProfit", () => {
  it("computes profit for positive (underdog) odds", () => {
    expect(americanProfit(150, 100)).toBe(150);
    expect(americanProfit(100, 50)).toBe(50);
  });

  it("computes profit for negative (favorite) odds", () => {
    expect(americanProfit(-110, 110)).toBeCloseTo(100, 5);
    expect(americanProfit(-200, 100)).toBe(50);
  });
});

describe("betProfit", () => {
  it("derives profit from odds/stake when there is no override", () => {
    expect(betProfit({ status: "won", odds: 150, stake: 100 })).toBe(150);
    expect(betProfit({ status: "lost", odds: 150, stake: 100 })).toBe(-100);
    expect(betProfit({ status: "push", odds: 150, stake: 100 })).toBe(0);
  });

  it("honors actual_profit when present, even if it contradicts status/odds", () => {
    // A cashed-out "won" bet paid out less than the full odds x stake.
    expect(
      betProfit({ status: "won", odds: 150, stake: 100, actual_profit: 40 }),
    ).toBe(40);
    // actual_profit can be negative on a "won" pushed-leg parlay that
    // still nets a loss after the payout was recalculated.
    expect(
      betProfit({ status: "won", odds: 500, stake: 100, actual_profit: -20 }),
    ).toBe(-20);
  });

  it("treats a null actual_profit the same as no override", () => {
    expect(
      betProfit({ status: "lost", odds: -110, stake: 55, actual_profit: null }),
    ).toBe(-55);
  });
});

describe("overallStats / groupStats", () => {
  const bets = [
    { sport: "nfl", bet_type: "moneyline", status: "won", odds: 150, stake: 100 },
    { sport: "nfl", bet_type: "spread", status: "lost", odds: -110, stake: 110 },
    { sport: "nba", bet_type: "total", status: "push", odds: -110, stake: 50 },
    { sport: "nba", bet_type: "moneyline", status: "pending", odds: 200, stake: 25 },
  ];

  it("aggregates wins/losses/pushes/pending and profit correctly", () => {
    const overall = overallStats(bets);
    expect(overall.wins).toBe(1);
    expect(overall.losses).toBe(1);
    expect(overall.pushes).toBe(1);
    expect(overall.pending).toBe(1);
    expect(overall.profit).toBe(150 - 110);
    expect(overall.staked).toBe(100 + 110 + 50);
    expect(overall.winRate).toBeCloseTo(0.5, 5);
    expect(overall.roi).toBeCloseTo((150 - 110) / 260, 5);
  });

  it("respects an actual_profit override when aggregating", () => {
    const overridden = [
      { sport: "nfl", bet_type: "moneyline", status: "won", odds: 150, stake: 100, actual_profit: 10 },
    ];
    expect(overallStats(overridden).profit).toBe(10);
  });

  it("groups by an arbitrary key without losing extra fields on the input type", () => {
    const bySport = groupStats(bets, (b) => ({ key: b.sport, label: b.sport }));
    const nfl = bySport.find((r) => r.key === "nfl")!;
    const nba = bySport.find((r) => r.key === "nba")!;
    expect(nfl.count).toBe(2);
    expect(nfl.profit).toBe(150 - 110);
    expect(nba.count).toBe(2);
    expect(nba.pending).toBe(1);
  });
});
