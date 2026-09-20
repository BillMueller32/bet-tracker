import { describe, expect, it } from "vitest";
import { localDayKey, estimateGameEnd } from "@/lib/bets/time";

describe("localDayKey", () => {
  it("keeps a daytime UTC instant on the same Pacific calendar day", () => {
    // Noon UTC on Sep 20 is 5am PDT on Sep 20 — same day either way.
    expect(localDayKey("2026-09-20T12:00:00Z")).toBe("2026-09-20");
  });

  it("files a Pacific-evening game under the correct (earlier) local day", () => {
    // 7:30pm PDT on Sep 19 is 2:30am UTC on Sep 20 — this is exactly the
    // bug the review flagged: slicing the UTC date directly would file
    // this under Sep 20, an entire day into the future from the bettor's
    // perspective.
    expect(localDayKey("2026-09-20T02:30:00Z")).toBe("2026-09-19");
  });

  it("files a late-night Pacific game under the same local day it started", () => {
    // 11:45pm PDT on Sep 19 is 6:45am UTC on Sep 20.
    expect(localDayKey("2026-09-20T06:45:00Z")).toBe("2026-09-19");
  });

  it("handles the winter (PST, UTC-8) offset too, not just PDT", () => {
    // 5:30pm PST on Jan 14 is 1:30am UTC on Jan 15.
    expect(localDayKey("2026-01-15T01:30:00Z")).toBe("2026-01-14");
  });
});

describe("estimateGameEnd", () => {
  it("adds the sport's duration constant to the start time", () => {
    const end = estimateGameEnd("2026-09-20T20:00:00Z", "nfl");
    expect(end.toISOString()).toBe("2026-09-20T23:30:00.000Z");
  });

  it("falls back to a generic duration for an unlisted sport", () => {
    const end = estimateGameEnd("2026-09-20T20:00:00Z", "golf");
    expect(end.toISOString()).toBe("2026-09-20T23:00:00.000Z");
  });
});
