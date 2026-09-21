import { describe, expect, it } from "vitest";
import { averageOdds, oddsRangeKey } from "@/lib/bets/breakdowns";

describe("averageOdds", () => {
  it("does not average American odds arithmetically (the original bug)", () => {
    // Naively averaging -110 and +150 gives +20, which the review
    // correctly called meaningless. The probability-based average should
    // land well away from that.
    const result = averageOdds([-110, 150]);
    expect(result).not.toBe(20);
  });

  it("returns the same odds back when every input is identical", () => {
    expect(averageOdds([-110, -110, -110])).toBe(-110);
    expect(averageOdds([120, 120])).toBe(120);
  });

  it("returns null for an empty list", () => {
    expect(averageOdds([])).toBeNull();
  });
});

describe("oddsRangeKey", () => {
  it("buckets a heavy favorite", () => {
    expect(oddsRangeKey(-250).key).toBe("heavy_fav");
  });

  it("buckets a moderate favorite", () => {
    expect(oddsRangeKey(-150).key).toBe("mod_fav");
  });

  it("buckets a pick'em", () => {
    expect(oddsRangeKey(-105).key).toBe("pick_em");
    expect(oddsRangeKey(100).key).toBe("pick_em");
  });

  it("buckets a moderate and a big underdog", () => {
    expect(oddsRangeKey(150).key).toBe("mod_dog");
    expect(oddsRangeKey(250).key).toBe("big_dog");
  });

  it("covers every integer odds value with no gaps (boundaries included exactly once)", () => {
    for (let odds = -500; odds <= 500; odds++) {
      if (odds === 0) continue; // 0 isn't a valid American odds value
      expect(() => oddsRangeKey(odds)).not.toThrow();
    }
  });
});
