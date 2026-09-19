import Link from "next/link";
import { MULTI_LEG_BET_TYPES, type Bet } from "@/lib/bets/constants";
import { formatOdds, formatStake, statusBadgeClass } from "@/lib/bets/format";

export function BetCard({ bet }: { bet: Bet }) {
  const legs = bet.bet_legs ?? [];
  const isMultiLeg = MULTI_LEG_BET_TYPES.includes(bet.bet_type);

  return (
    <Link
      href={`/bets/${bet.id}/edit`}
      className="block rounded-md border border-neutral-800 bg-neutral-900 p-3 hover:border-neutral-700"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {isMultiLeg ? `${bet.sport} · ${legs.length}-leg ${bet.bet_type}` : bet.sport}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(bet.status)}`}
        >
          {bet.status}
        </span>
      </div>
      <p className="text-sm font-medium text-neutral-100">{bet.event_name}</p>

      {isMultiLeg && legs.length > 0 ? (
        <ul className="mt-1 space-y-0.5">
          {legs.map((leg, i) => (
            <li key={leg.id ?? i} className="text-sm text-neutral-300">
              {leg.participant ? `${leg.participant} — ` : ""}
              {leg.selection}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-300">
          {bet.participant ? `${bet.participant} — ` : ""}
          {bet.selection}
        </p>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
        <span>{formatOdds(bet.odds)}</span>
        <span>{formatStake(bet.stake)} stake</span>
      </div>
    </Link>
  );
}
