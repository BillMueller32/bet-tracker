"use client";

import { useMemo, useRef, useState } from "react";
import { formatSignedDollars } from "@/lib/bets/format";
import {
  TIMEFRAMES,
  cumulativePLSeries,
  timeframeStartDate,
  type PLPoint,
  type TimeframeKey,
} from "@/lib/bets/timeseries";

type SettleableBet = {
  status: string;
  odds: number;
  stake: number;
  placed_at: string;
  settled_at: string | null;
};

const WIDTH = 640;
const HEIGHT = 240;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const PAD_X = 8;

function formatAxisDate(dateISO: string): string {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function PLChart({ bets }: { bets: SettleableBet[] }) {
  const [timeframe, setTimeframe] = useState<TimeframeKey>("30d");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const points = useMemo(() => {
    const start = timeframeStartDate(timeframe);
    const filtered = start
      ? bets.filter((b) => new Date(b.settled_at ?? b.placed_at) >= start)
      : bets;
    return cumulativePLSeries(filtered);
  }, [bets, timeframe]);

  const plot = useMemo(() => {
    if (points.length === 0) return null;

    const values = points.map((p) => p.cumulative);
    const rawMin = Math.min(0, ...values);
    const rawMax = Math.max(0, ...values);
    const span = rawMax - rawMin || 1;
    const min = rawMin - span * 0.1;
    const max = rawMax + span * 0.1;

    const plotWidth = WIDTH - PAD_X * 2;
    const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

    const x = (i: number) =>
      PAD_X + (points.length === 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth);
    const y = (v: number) =>
      PAD_TOP + plotHeight - ((v - min) / (max - min)) * plotHeight;

    const zeroY = y(0);
    const zeroFraction = (zeroY - PAD_TOP) / plotHeight;

    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.cumulative).toFixed(1)}`)
      .join(" ");

    const areaPath =
      `M${x(0).toFixed(1)},${zeroY.toFixed(1)} ` +
      points.map((p, i) => `L${x(i).toFixed(1)},${y(p.cumulative).toFixed(1)}`).join(" ") +
      ` L${x(points.length - 1).toFixed(1)},${zeroY.toFixed(1)} Z`;

    return { x, y, zeroY, zeroFraction, linePath, areaPath, plotWidth, plotHeight };
  }, [points]);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const index = Math.round(fraction * (points.length - 1));
    setHoverIndex(index);
  }

  const hovered: PLPoint | null =
    hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-200">Profit &amp; loss</h2>
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              type="button"
              onClick={() => setTimeframe(tf.value)}
              className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                timeframe === tf.value
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {!plot ? (
        <p className="flex h-40 items-center justify-center text-center text-sm text-neutral-400">
          No settled bets in this window yet.
        </p>
      ) : (
        <div
          ref={containerRef}
          className="relative select-none"
          style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-full w-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id="pl-gradient"
                gradientUnits="userSpaceOnUse"
                x1={WIDTH / 2}
                y1={PAD_TOP}
                x2={WIDTH / 2}
                y2={HEIGHT - PAD_BOTTOM}
              >
                <stop offset="0" stopColor="#4ade80" />
                <stop offset={plot.zeroFraction} stopColor="#4ade80" />
                <stop offset={plot.zeroFraction} stopColor="#f87171" />
                <stop offset="1" stopColor="#f87171" />
              </linearGradient>
            </defs>

            {/* Zero baseline */}
            <line
              x1={PAD_X}
              y1={plot.zeroY}
              x2={WIDTH - PAD_X}
              y2={plot.zeroY}
              stroke="#27272a"
              strokeWidth={1}
            />

            <path d={plot.areaPath} fill="url(#pl-gradient)" fillOpacity={0.12} stroke="none" />
            <path
              d={plot.linePath}
              fill="none"
              stroke="url(#pl-gradient)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {hovered && hoverIndex !== null && (
              <>
                <line
                  x1={plot.x(hoverIndex)}
                  y1={PAD_TOP}
                  x2={plot.x(hoverIndex)}
                  y2={HEIGHT - PAD_BOTTOM}
                  stroke="#525252"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={plot.x(hoverIndex)}
                  cy={plot.y(hovered.cumulative)}
                  r={5}
                  fill={hovered.cumulative >= 0 ? "#4ade80" : "#f87171"}
                  stroke="#171717"
                  strokeWidth={2}
                />
              </>
            )}

            <text x={PAD_X} y={HEIGHT - 8} className="fill-neutral-500 text-[10px]">
              {formatAxisDate(points[0].date)}
            </text>
            <text
              x={WIDTH - PAD_X}
              y={HEIGHT - 8}
              textAnchor="end"
              className="fill-neutral-500 text-[10px]"
            >
              {formatAxisDate(points[points.length - 1].date)}
            </text>
          </svg>

          {hovered && (
            <div
              className="pointer-events-none absolute top-0 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs whitespace-nowrap shadow-lg"
              style={{
                left: `${(hoverIndex! / Math.max(1, points.length - 1)) * 100}%`,
                transform:
                  hoverIndex! > points.length / 2
                    ? "translate(-100%, 0)"
                    : "translate(0, 0)",
              }}
            >
              <div className="text-neutral-400">{formatAxisDate(hovered.date)}</div>
              <div
                className={
                  hovered.cumulative >= 0 ? "font-semibold text-green-400" : "font-semibold text-red-400"
                }
              >
                {formatSignedDollars(hovered.cumulative)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
