import { describe, expect, it } from "vitest";
import {
  combineLegOutcomes,
  gradeLeg,
  gradeSingleBet,
  previewLegOutcome,
  previewSingleBetOutcome,
} from "@/lib/bets/grade";
import { sideOfEvent, type EspnEvent } from "@/lib/sports/espn";

function event(overrides: Partial<EspnEvent> = {}): EspnEvent {
  return {
    id: "1",
    name: "Bills at Chiefs",
    shortName: "BUF @ KC",
    date: "2026-09-20T20:00:00Z",
    homeTeam: "Kansas City Chiefs",
    awayTeam: "Buffalo Bills",
    homeNames: ["Kansas City Chiefs", "Chiefs", "KC"],
    awayNames: ["Buffalo Bills", "Bills", "BUF"],
    homeScore: "24",
    awayScore: "20",
    status: { state: "post", detail: "Final" },
    ...overrides,
  };
}

describe("gradeSingleBet — moneyline", () => {
  it("wins when the picked side has the higher score", () => {
    const bet = { participant: "Kansas City Chiefs", event_name: "", selection: "Chiefs ML", line: null, bet_type: "moneyline" };
    expect(gradeSingleBet(bet, event())?.outcome).toBe("won");
  });

  it("loses when the picked side has the lower score", () => {
    const bet = { participant: "Buffalo Bills", event_name: "", selection: "Bills ML", line: null, bet_type: "moneyline" };
    expect(gradeSingleBet(bet, event())?.outcome).toBe("lost");
  });

  it("pushes on a tie", () => {
    const bet = { participant: "Buffalo Bills", event_name: "", selection: "Bills ML", line: null, bet_type: "moneyline" };
    expect(gradeSingleBet(bet, event({ homeScore: "20", awayScore: "20" }))?.outcome).toBe("push");
  });

  it("returns null (not gradable) when the game hasn't gone final", () => {
    const bet = { participant: "Kansas City Chiefs", event_name: "", selection: "Chiefs ML", line: null, bet_type: "moneyline" };
    expect(gradeSingleBet(bet, event({ status: { state: "in", detail: "3rd" } }))).toBeNull();
  });

  it("returns null for a bet type that isn't mechanically gradable", () => {
    const bet = { participant: "Kansas City Chiefs", event_name: "", selection: "Mahomes Over 275.5 yds", line: 275.5, bet_type: "player_prop" };
    expect(gradeSingleBet(bet, event())).toBeNull();
  });
});

describe("gradeSingleBet — spread", () => {
  it("covers when the margin plus the line is positive", () => {
    // Chiefs -3.5, won by 4 -> covers.
    const bet = { participant: "Kansas City Chiefs", event_name: "", selection: "Chiefs -3.5", line: -3.5, bet_type: "spread" };
    expect(gradeSingleBet(bet, event())?.outcome).toBe("won");
  });

  it("fails to cover when the margin plus the line is negative", () => {
    // Chiefs -5.5, won by 4 -> doesn't cover.
    const bet = { participant: "Kansas City Chiefs", event_name: "", selection: "Chiefs -5.5", line: -5.5, bet_type: "spread" };
    expect(gradeSingleBet(bet, event())?.outcome).toBe("lost");
  });

  it("pushes when the margin exactly matches the line", () => {
    const bet = { participant: "Kansas City Chiefs", event_name: "", selection: "Chiefs -4", line: -4, bet_type: "spread" };
    expect(gradeSingleBet(bet, event())?.outcome).toBe("push");
  });
});

describe("gradeSingleBet — total", () => {
  it("grades the over correctly", () => {
    // Total score 44, line 42.5 -> over wins.
    const bet = { participant: null, event_name: "", selection: "Over 42.5", line: 42.5, bet_type: "total" };
    expect(gradeSingleBet(bet, event())?.outcome).toBe("won");
  });

  it("grades the under correctly", () => {
    const bet = { participant: null, event_name: "", selection: "Under 42.5", line: 42.5, bet_type: "total" };
    expect(gradeSingleBet(bet, event())?.outcome).toBe("lost");
  });

  it("pushes when the total exactly matches the line", () => {
    const bet = { participant: null, event_name: "", selection: "Over 44", line: 44, bet_type: "total" };
    expect(gradeSingleBet(bet, event())?.outcome).toBe("push");
  });
});

describe("previewSingleBetOutcome", () => {
  const bet = { participant: "Kansas City Chiefs", event_name: "", selection: "Chiefs ML", line: null, bet_type: "moneyline" };

  it("returns null while the game hasn't started (0-0 pre scores would otherwise look like a real result)", () => {
    expect(previewSingleBetOutcome(bet, event({ status: { state: "pre", detail: "" }, homeScore: "0", awayScore: "0" }))).toBeNull();
  });

  it("grades an in-progress game the same as a final one", () => {
    expect(previewSingleBetOutcome(bet, event({ status: { state: "in", detail: "4th" } }))).toBe("won");
  });
});

describe("gradeLeg / previewLegOutcome — type inferred from the leg's own fields", () => {
  it("grades as moneyline when there's no line", () => {
    const leg = { participant: "Buffalo Bills", event_name: "", selection: "Bills", line: null };
    expect(gradeLeg(leg, event())?.outcome).toBe("lost");
  });

  it("grades as total when the selection says over/under, even with no participant (the normal case for a total pick)", () => {
    // Regression test: computeLegOutcome used to require a resolved
    // side (participant/event_name matching one of the two teams)
    // before it would even check whether the leg was a total — but a
    // total pick isn't about either team, so a leg with no participant
    // (the common case) would never auto-grade at all.
    const leg = { participant: null, event_name: "", selection: "Over 40", line: 40, bet_type: "total" };
    expect(gradeLeg(leg, event())?.outcome).toBe("won");
  });

  it("grades as spread otherwise", () => {
    const leg = { participant: "Buffalo Bills", event_name: "", selection: "Bills +2.5", line: 2.5 };
    // Bills lost by 4, +2.5 isn't enough to cover.
    expect(gradeLeg(leg, event())?.outcome).toBe("lost");
  });

  it("refuses to grade a leg whose participant doesn't clearly match either team", () => {
    // e.g. a player prop leg mixed into a parlay's legs table.
    const leg = { participant: "Patrick Mahomes", event_name: "", selection: "Mahomes Over 2.5 TD", line: 2.5 };
    expect(gradeLeg(leg, event())).toBeNull();
  });

  it("does not misgrade a player-prop 'Over/Under' leg as a team total just because it names a participant", () => {
    // Regression guard for the fix above: skipping the side-match gate
    // for anything matching /over|under/i (rather than only when there's
    // no participant) would grade this against the game's real total
    // (44) instead of correctly refusing to guess — the exact failure
    // mode the original safety-gate comment warned about.
    const leg = { participant: "Patrick Mahomes", event_name: "", selection: "Mahomes Under 2.5 TD", line: 2.5 };
    expect(gradeLeg(leg, event())).toBeNull();
  });

  it("previewLegOutcome mirrors gradeLeg but also works pre-final", () => {
    const leg = { participant: "Kansas City Chiefs", event_name: "", selection: "Chiefs", line: null };
    expect(previewLegOutcome(leg, event({ status: { state: "in", detail: "3rd" } }))).toBe("won");
    expect(previewLegOutcome(leg, event({ status: { state: "pre", detail: "" } }))).toBeNull();
  });
});

describe("combineLegOutcomes", () => {
  it("settles lost the moment any leg is confirmed lost, regardless of the others", () => {
    expect(combineLegOutcomes(["won", "lost", null])).toBe("lost");
    expect(combineLegOutcomes(["lost", "push"])).toBe("lost");
  });

  it("blocks settlement (null) while any leg is still ungraded, short of a loss", () => {
    expect(combineLegOutcomes(["won", null])).toBeNull();
  });

  it("holds a push for manual review instead of resolving it automatically", () => {
    expect(combineLegOutcomes(["won", "push"])).toBeNull();
  });

  it("settles won only when every leg is confirmed won", () => {
    expect(combineLegOutcomes(["won", "won", "won"])).toBe("won");
  });
});

describe("sideOfEvent — prefix matching avoids substring false positives", () => {
  const ncaaGame = event({
    homeTeam: "West Virginia Mountaineers",
    awayTeam: "Virginia Cavaliers",
    homeNames: ["West Virginia Mountaineers", "West Virginia", "WVU"],
    awayNames: ["Virginia Cavaliers", "Virginia", "UVA"],
  });

  it("does not match 'Virginia' to 'West Virginia' via containment", () => {
    expect(sideOfEvent(ncaaGame, "Virginia")).toBe("away");
    expect(sideOfEvent(ncaaGame, "West Virginia")).toBe("home");
  });
});
