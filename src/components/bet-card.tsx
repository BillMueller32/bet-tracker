import Link from "next/link";
import { MULTI_LEG_BET_TYPES, type Bet } from "@/lib/bets/constants";
import { formatOdds, formatStake, statusBadgeClass } from "@/lib/bets/format";
import type { EspnEvent } from "@/lib/sports/espn";

function GameStatusLine({ event }: { event: EspnEvent }) {
  const isLive = event.status.state === "in";
  const hasScore = event.homeScore !== undefined && event.awayScore !== undefined;

  return (
    <p className={`text-xs ${isLive ? "text-red-400" : "text-neutral-500"}`}>
      {isLive && "● "}
      {event.status.detail}
      {hasScore &&
        ` — ${event.awayTeam} ${event.awayScore}, ${event.homeTeam} ${event.homeScore}`}
    </p>
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
      className="block rounded-md border border-neutral-800 bg-neutral-900 p-3 hover:border-neutral-700"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {isMultiLeg
            ? `${bet.sport} · ${legs.length}-leg ${bet.bet_type}${
                bet.bet_type === "teaser" && bet.teaser_points
                  ? ` (${bet.teaser_points}pt)`
                  : ""
              }`
            : bet.sport}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(bet.status)}`}
        >
          {bet.status}
        </span>
      </div>
      <p className="text-sm font-medium text-neutral-100">{bet.event_name}</p>

      {isMultiLeg && legs.length > 0 ? (
        <ul className="mt-1 space-y-1">
          {legs.map((leg, i) => {
            const legGame = leg.external_event_id
              ? liveStatuses?.get(leg.external_event_id)
              : undefined;
            return (
              <li key={leg.id ?? i}>
                <p className="text-sm text-neutral-300">
                  {leg.participant ? `${leg.participant} — ` : ""}
                  {leg.selection}
                </p>
                {legGame && <GameStatusLine event={legGame} />}
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          <p className="text-sm text-neutral-300">
            {bet.participant ? `${bet.participant} — ` : ""}
            {bet.selection}
          </p>
          {topGame && (
            <div className="mt-0.5">
              <GameStatusLine event={topGame} />
            </div>
          )}
        </>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
        <span>{formatOdds(bet.odds)}</span>
        <span>{formatStake(bet.stake)} stake</span>
      </div>

      {needsReview && (
        <p className="mt-2 rounded-md bg-amber-950 px-2 py-1 text-xs text-amber-300">
          Game{isMultiLeg && legs.length > 1 ? "s" : ""} final — tap to set
          the result
        </p>
      )}
    </Link>
  );
}
