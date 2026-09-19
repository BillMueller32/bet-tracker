import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BetCard } from "@/components/bet-card";
import type { Bet } from "@/lib/bets/constants";

const ACTIVE_STATUSES = new Set(["pending", "live"]);

function sortBets(bets: Bet[]): Bet[] {
  return [...bets].sort((a, b) => {
    const aActive = ACTIVE_STATUSES.has(a.status);
    const bActive = ACTIVE_STATUSES.has(b.status);
    if (aActive !== bActive) return aActive ? -1 : 1;
    return (
      new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime()
    );
  });
}

export default async function BetsPage() {
  const supabase = await createClient();
  const { data: bets, error } = await supabase
    .from("bets")
    .select("*")
    .order("placed_at", { ascending: false });

  const sortedBets = bets ? sortBets(bets) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-100">Your bets</h1>
        <div className="flex gap-2">
          <Link
            href="/bets/new/screenshot"
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-100"
          >
            From screenshot
          </Link>
          <Link
            href="/bets/new"
            className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900"
          >
            Add bet
          </Link>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-900 bg-red-950 p-3 text-sm text-red-300">
          Couldn&apos;t load bets: {error.message}
        </p>
      )}

      {!error && sortedBets.length === 0 && (
        <p className="rounded-md border border-dashed border-neutral-700 p-6 text-center text-sm text-neutral-400">
          No bets yet. Tap &quot;Add bet&quot; to log your first one.
        </p>
      )}

      {!error && sortedBets.length > 0 && (
        <ul className="space-y-2">
          {sortedBets.map((bet) => (
            <li key={bet.id}>
              <BetCard bet={bet} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
