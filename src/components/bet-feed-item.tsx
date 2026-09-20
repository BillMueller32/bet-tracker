import Link from "next/link";
import { MULTI_LEG_BET_TYPES, type Bet } from "@/lib/bets/constants";
import { americanProfit } from "@/lib/bets/stats";
import {
  cleanEventName,
  displayPick,
  formatOdds,
  formatSignedDollars,
  formatStake,
  profitTextClass,
  sportEmoji,
} from "@/lib/bets/format";

const RESULT_LABEL: Record<string, string> = {
  won: "WIN",
  lost: "LOSS",
  push: "PUSH",
  pending: "PENDING",
  live: "LIVE",
  cancelled: "VOID",
};

function relativeDay(dateISO: string): string {
  const date = new Date(dateISO);
  const today = new Date();
  const diffDays = Math.round(
    (new Date(date.toDateString()).getTime() - new Date(today.toDateString()).getTime()) /
      86400000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === -1) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function BetFeedItem({ bet }: { bet: Bet }) {
  const isMultiLeg = MULTI_LEG_BET_TYPES.includes(bet.bet_type);
  const legCount = bet.bet_legs?.length ?? 0;

  const title = isMultiLeg
    ? cleanEventName(bet.selection || bet.event_name)
    : displayPick(bet.participant, bet.selection) || cleanEventName(bet.event_name);

  const subtitle = isMultiLeg
    ? `${bet.sport.toUpperCase()} · ${legCount}-leg ${bet.bet_type}`
    : `${bet.sport.toUpperCase()} · ${bet.bet_type.replace("_", " ")}`;

  const profit =
    bet.status === "won"
      ? americanProfit(bet.odds, bet.stake)
      : bet.status === "lost"
        ? -bet.stake
        : null;

  return (
    <Link
      href={`/bets/${bet.id}/edit`}
      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-neutral-100">{title}</p>
        <p className="mt-0.5 text-xs text-neutral-400">
          <span className="mr-1">{sportEmoji(bet.sport)}</span>
          {subtitle}
        </p>
        <p className="mt-0.5 text-xs text-neutral-400">
          {formatOdds(bet.odds)} · {formatStake(bet.stake)} stake
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-semibold tracking-wide text-neutral-400">
          {RESULT_LABEL[bet.status] ?? bet.status.toUpperCase()}
        </p>
        {profit !== null && (
          <p className={`text-sm font-semibold ${profitTextClass(profit)}`}>
            {formatSignedDollars(profit)}
          </p>
        )}
        <p className="mt-0.5 text-[11px] text-neutral-400">
          {relativeDay(bet.settled_at ?? bet.placed_at)}
        </p>
      </div>
    </Link>
  );
}
