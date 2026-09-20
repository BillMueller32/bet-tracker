export type StatBet = {
  sport: string;
  bet_type: string;
  status: string;
  odds: number;
  stake: number;
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
      row.profit += americanProfit(bet.odds, bet.stake);
      break;
    case "lost":
      row.losses++;
      row.staked += bet.stake;
      row.profit -= bet.stake;
      break;
    case "push":
      row.pushes++;
      row.staked += bet.stake;
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

export function groupStats(
  bets: StatBet[],
  keyFn: (bet: StatBet) => { key: string; label: string },
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
