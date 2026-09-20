"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SPORTS, BET_TYPES } from "@/lib/bets/constants";
import { TIMEFRAMES, type TimeframeKey } from "@/lib/bets/timeseries";

const selectClass =
  "rounded-md border border-neutral-700 bg-neutral-800 px-2.5 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400";

export function AnalyticsFilters({
  sport,
  betType,
  timeframe,
}: {
  sport: string;
  betType: string;
  timeframe: TimeframeKey | "all";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/analytics?${params.toString()}`);
  }

  const hasFilters = sport || betType || timeframe !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={sport}
        onChange={(e) => setParam("sport", e.target.value)}
        className={selectClass}
      >
        <option value="">All sports</option>
        {SPORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <select
        value={betType}
        onChange={(e) => setParam("betType", e.target.value)}
        className={selectClass}
      >
        <option value="">All bet types</option>
        {BET_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <select
        value={timeframe}
        onChange={(e) => setParam("tf", e.target.value)}
        className={selectClass}
      >
        <option value="all">All time</option>
        {TIMEFRAMES.filter((t) => t.value !== "all").map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push("/analytics")}
          className="rounded-md px-2.5 py-2 text-sm font-medium text-neutral-400 hover:text-neutral-200"
        >
          Clear
        </button>
      )}
    </div>
  );
}
