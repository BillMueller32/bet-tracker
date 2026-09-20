import Link from "next/link";
import { MULTI_LEG_BET_TYPES, type Bet } from "@/lib/bets/constants";
import {
  cleanEventName,
  displayPick,
  formatOdds,
  formatStake,
  statusBadgeClass,
} from "@/lib/bets/format";
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

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-neutral-800/80 px-2 py-1 text-xs font-medium text-neutral-300">
      {children}
    </span>
  );
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
  const allGamesFinal = isMultiLeg
    ? legs.length > 0 &&
      legs.every((leg) => {
        const g = leg.external_event_id
          ? liveStatuses?.get(leg.external_event_id)
          : undefined;
        return g?.status.state === "post";
      })
    : topGame?.status.state === "post";
  const needsReview = isUnsettled && allGamesFinal;

  return (
    <Link
      href={`/bets/${bet.id}/edit`}
      className="block rounded-lg border border-neutral-800 bg-neutral-900 p-4 transition-colors hover:border-neutral-700"
    >
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
                <p className="text-sm text-neutral-200">
                  {displayPick(leg.participant, leg.selection)}
                </p>
                {legGame && <GameStatusLine event={legGame} />}
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          <p className="mt-1 text-sm text-neutral-300">
            {displayPick(bet.participant, bet.selection)}
          </p>
          {topGame && <GameStatusLine event={topGame} />}
        </>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Chip>{formatOdds(bet.odds)}</Chip>
        <Chip>{formatStake(bet.stake)} stake</Chip>
      </div>

      {needsReview && (
        <p className="mt-3 rounded-md bg-amber-950 px-2.5 py-1.5 text-xs font-medium text-amber-300">
          Game{isMultiLeg && legs.length > 1 ? "s" : ""} final — tap to set
          the result
        </p>
      )}
    </Link>
  );
}
