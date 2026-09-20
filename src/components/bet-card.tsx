import Link from "next/link";
import { MULTI_LEG_BET_TYPES, type Bet, type BetLeg } from "@/lib/bets/constants";
import { americanProfit } from "@/lib/bets/stats";
import {
  cleanEventName,
  displayPick,
  formatOdds,
  formatStake,
  formatStartTime,
  statusBadgeClass,
} from "@/lib/bets/format";
import { allLinkedGamesFinal } from "@/lib/bets/action-summary";
import {
  previewLegOutcome,
  previewSingleBetOutcome,
  type GradeOutcome,
} from "@/lib/bets/grade";
import { SettleBetButtons } from "@/components/settle-bet-buttons";
import type { EspnEvent } from "@/lib/sports/espn";

function GameStatusLine({ event }: { event: EspnEvent }) {
  const isLive = event.status.state === "in";
  const hasScore = event.homeScore !== undefined && event.awayScore !== undefined;

  return (
    <p
      className={`mt-1 flex items-center gap-1.5 text-xs ${
        isLive ? "text-red-400" : "text-neutral-400"
      }`}
    >
      {isLive && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
      )}
      <span>
        {event.status.detail}
        {hasScore &&
          ` — ${event.awayTeam} ${event.awayScore}, ${event.homeTeam} ${event.homeScore}`}
      </span>
    </p>
  );
}

const HITTING_LABEL: Record<GradeOutcome, { text: string; className: string }> = {
  won: { text: "Hitting", className: "bg-green-950 text-green-300" },
  lost: { text: "Not hitting", className: "bg-red-950 text-red-300" },
  push: { text: "Push", className: "bg-blue-950 text-blue-300" },
};

function HittingBadge({ outcome }: { outcome: GradeOutcome | null }) {
  if (!outcome) return null;
  const { text, className } = HITTING_LABEL[outcome];
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${className}`}>
      {text}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-neutral-800/80 px-2 py-1 text-xs font-medium text-neutral-300">
      {children}
    </span>
  );
}

// Earliest linked start time across the bet or its legs, for display and
// for the "starts soonest first" sort on the bets list.
export function betStartTime(bet: Bet): string | null {
  const legs = bet.bet_legs ?? [];
  const starts =
    MULTI_LEG_BET_TYPES.includes(bet.bet_type) && legs.length > 0
      ? legs.map((leg) => leg.event_start).filter((s): s is string => !!s)
      : bet.event_start
        ? [bet.event_start]
        : [];
  if (starts.length === 0) return null;
  return starts.reduce((a, b) => (b < a ? b : a));
}

function legOutcome(leg: BetLeg, event: EspnEvent | undefined): GradeOutcome | null {
  return event ? previewLegOutcome(leg, event) : null;
}

export function BetCard({
  bet,
  liveStatuses,
}: {
  bet: Bet;
  liveStatuses?: Map<string, EspnEvent>;
}) {
  const legs = bet.bet_legs ?? [];
  const isMultiLeg = MULTI_LEG_BET_TYPES.includes(bet.bet_type);
  const topGame = bet.external_event_id
    ? liveStatuses?.get(bet.external_event_id)
    : undefined;

  const isUnsettled = bet.status === "pending" || bet.status === "live";
  const needsReview =
    isUnsettled && allLinkedGamesFinal(bet, liveStatuses ?? new Map());

  const toWin = americanProfit(bet.odds, bet.stake);
  const startTime = betStartTime(bet);
  const singleOutcome =
    isUnsettled && !isMultiLeg && topGame
      ? previewSingleBetOutcome(bet, topGame)
      : null;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 transition-colors hover:border-neutral-700">
      <Link href={`/bets/${bet.id}/edit`} className="block p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            {isMultiLeg
              ? `${bet.sport} · ${legs.length}-leg ${bet.bet_type}${
                  bet.bet_type === "teaser" && bet.teaser_points
                    ? ` (${bet.teaser_points}pt)`
                    : ""
                }`
              : bet.sport}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(bet.status)}`}
          >
            {bet.status}
          </span>
        </div>

        <p className="text-base font-semibold leading-snug text-neutral-100">
          {cleanEventName(bet.event_name)}
        </p>

        {isMultiLeg && legs.length > 0 ? (
          <ul className="mt-2 divide-y divide-neutral-800/80">
            {legs.map((leg, i) => {
              const legGame = leg.external_event_id
                ? liveStatuses?.get(leg.external_event_id)
                : undefined;
              return (
                <li key={leg.id ?? i} className="py-2 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-neutral-200">
                      {displayPick(leg.participant, leg.selection)}
                    </p>
                    {isUnsettled && <HittingBadge outcome={legOutcome(leg, legGame)} />}
                  </div>
                  {legGame && <GameStatusLine event={legGame} />}
                </li>
              );
            })}
          </ul>
        ) : (
          <>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-sm text-neutral-300">
                {displayPick(bet.participant, bet.selection)}
              </p>
              {isUnsettled && <HittingBadge outcome={singleOutcome} />}
            </div>
            {topGame && <GameStatusLine event={topGame} />}
          </>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip>{formatOdds(bet.odds)}</Chip>
          <Chip>{formatStake(bet.stake)} stake</Chip>
          <Chip>{formatStake(toWin)} to win</Chip>
          {startTime && <Chip>{formatStartTime(startTime)}</Chip>}
        </div>

        {needsReview && (
          <p className="mt-3 rounded-md bg-amber-950 px-2.5 py-1.5 text-xs font-medium text-amber-300">
            Game{isMultiLeg && legs.length > 1 ? "s" : ""} final — tap to set
            the result
          </p>
        )}
      </Link>

      {isUnsettled && (
        <div className="px-4 pb-4">
          <SettleBetButtons betId={bet.id} />
        </div>
      )}
    </div>
  );
}
