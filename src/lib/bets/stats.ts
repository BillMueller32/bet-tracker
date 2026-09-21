export type StatBet = {
  sport: string;
  bet_type: string;
  status: string;
  odds: number;
  stake: number;
  actual_profit?: number | null;
};

export type StatRow = {
  key: string;
  label: string;
  count: number;
  wins: number;
  losses: number;
  pushes: number;
  cancelled: number;
  pending: number;
  staked: number;
  profit: number;
  winRate: number | null;
  roi: number | null;
};

export function americanProfit(odds: number, stake: number): number {
  return odds > 0 ? stake * (odds / 100) : stake * (100 / Math.abs(odds));
}

// Single source of truth for "what did this bet actually profit" —
// every other module (action summary, insights, timeseries, this file)
// should compute profit through this, never by re-deriving from odds and
// stake on its own, so a payout override only ever needs to be honored
// in one place.
export function betProfit(bet: {
  status: string;
  odds: number;
  stake: number;
  actual_profit?: number | null;
}): number {
  if (bet.actual_profit !== null && bet.actual_profit !== undefined) {
    return bet.actual_profit;
  }
  if (bet.status === "won") return americanProfit(bet.odds, bet.stake);
  if (bet.status === "lost") return -bet.stake;
  return 0;
}

function emptyRow(key: string, label: string): StatRow {
  return {
    key,
    label,
    count: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    cancelled: 0,
    pending: 0,
    staked: 0,
    profit: 0,
    winRate: null,
    roi: null,
  };
}

function accumulate(row: StatRow, bet: StatBet) {
  row.count++;
  switch (bet.status) {
    case "won":
      row.wins++;
      row.staked += bet.stake;
      row.profit += betProfit(bet);
      break;
    case "lost":
      row.losses++;
      row.staked += bet.stake;
      row.profit += betProfit(bet);
      break;
    case "push":
      row.pushes++;
      row.staked += bet.stake;
      row.profit += betProfit(bet);
      break;
    case "cancelled":
      row.cancelled++;
      break;
    default:
      row.pending++;
  }
}

function finalize(row: StatRow): StatRow {
  const decided = row.wins + row.losses;
  return {
    ...row,
    winRate: decided > 0 ? row.wins / decided : null,
    roi: row.staked > 0 ? row.profit / row.staked : null,
  };
}

export function overallStats(bets: StatBet[]): StatRow {
  const row = emptyRow("overall", "Overall");
  for (const bet of bets) accumulate(row, bet);
  return finalize(row);
}

export function groupStats<T extends StatBet>(
  bets: T[],
  keyFn: (bet: T) => { key: string; label: string },
): StatRow[] {
  const rows = new Map<string, StatRow>();
  for (const bet of bets) {
    const { key, label } = keyFn(bet);
    if (!rows.has(key)) rows.set(key, emptyRow(key, label));
    accumulate(rows.get(key)!, bet);
  }
  return Array.from(rows.values())
    .map(finalize)
    .sort((a, b) => b.count - a.count);
}
