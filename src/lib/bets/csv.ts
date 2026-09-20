import type { Bet } from "@/lib/bets/constants";
import { betProfit } from "@/lib/bets/stats";

const COLUMNS = [
  "placed_at",
  "event_start",
  "sport",
  "bet_type",
  "sportsbook",
  "event_name",
  "participant",
  "selection",
  "line",
  "odds",
  "stake",
  "status",
  "profit",
  "is_free_bet",
  "cash_out_amount",
  "settled_at",
  "notes",
] as const;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function betRow(bet: Bet): string {
  const decided = bet.status === "won" || bet.status === "lost" || bet.status === "push";
  const values: Record<(typeof COLUMNS)[number], unknown> = {
    placed_at: bet.placed_at,
    event_start: bet.event_start,
    sport: bet.sport,
    bet_type: bet.bet_type,
    sportsbook: bet.sportsbook,
    event_name: bet.event_name,
    participant: bet.participant,
    selection: bet.selection,
    line: bet.line,
    odds: bet.odds,
    stake: bet.stake,
    status: bet.status,
    profit: decided ? betProfit(bet).toFixed(2) : "",
    is_free_bet: bet.is_free_bet ?? false,
    cash_out_amount: bet.cash_out_amount,
    settled_at: bet.settled_at,
    notes: bet.notes,
  };
  return COLUMNS.map((c) => csvEscape(values[c])).join(",");
}

export function betsToCsv(bets: Bet[]): string {
  const header = COLUMNS.join(",");
  const rows = bets.map(betRow);
  return [header, ...rows].join("\n");
}
