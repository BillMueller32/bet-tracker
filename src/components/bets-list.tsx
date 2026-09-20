"use client";

import { useState } from "react";
import { BetCard } from "@/components/bet-card";
import { classifyBet } from "@/lib/bets/action-summary";
import type { Bet } from "@/lib/bets/constants";
import type { EspnEvent } from "@/lib/sports/espn";

type Filter = "all" | "live" | "pending" | "final";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "pending", label: "Pending" },
  { value: "final", label: "Final" },
];

// A bet needing manual review (game final, not yet settled) still reads
// as "pending" here — it's unsettled, and the card's own amber nudge
// already calls it out specifically.
function filterBucket(bet: Bet, liveStatuses: Map<string, EspnEvent>): Exclude<Filter, "all"> {
  const bucket = classifyBet(bet, liveStatuses);
  if (bucket === "final") return "final";
  if (bucket === "live") return "live";
  return "pending";
}

export function BetsList({
  bets,
  liveStatuses,
}: {
  bets: Bet[];
  liveStatuses: Map<string, EspnEvent>;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const buckets = new Map<string, number>([
    ["live", 0],
    ["pending", 0],
    ["final", 0],
  ]);
  for (const bet of bets) {
    const bucket = filterBucket(bet, liveStatuses);
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }

  const visible = filter === "all" ? bets : bets.filter((b) => filterBucket(b, liveStatuses) === filter);

  return (
    <div>
      <div className="mb-3 flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-neutral-100 text-neutral-900"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
            }`}
          >
            {f.label} {f.value === "all" ? bets.length : buckets.get(f.value)}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-700 p-6 text-center text-sm text-neutral-400">
          No {filter === "all" ? "" : `${filter} `}bets to show.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((bet) => (
            <li key={bet.id}>
              <BetCard bet={bet} liveStatuses={liveStatuses} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
