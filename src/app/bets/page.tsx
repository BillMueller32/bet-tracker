import { createClient } from "@/lib/supabase/server";

export default async function BetsPage() {
  const supabase = await createClient();
  const { data: bets, error } = await supabase
    .from("bets")
    .select("*")
    .order("placed_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-lg font-semibold text-neutral-100">
        Your bets
      </h1>

      {error && (
        <p className="rounded-md border border-red-900 bg-red-950 p-3 text-sm text-red-300">
          Couldn&apos;t load bets: {error.message}
        </p>
      )}

      {!error && bets?.length === 0 && (
        <p className="rounded-md border border-dashed border-neutral-700 p-6 text-center text-sm text-neutral-400">
          No bets yet. Adding a bet is coming in the next phase.
        </p>
      )}

      {!error && bets && bets.length > 0 && (
        <ul className="space-y-2">
          {bets.map((bet) => (
            <li
              key={bet.id}
              className="rounded-md border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-200"
            >
              {bet.event_name} — {bet.selection}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
