import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BetForm } from "@/components/bet-form";
import { updateBet, deleteBet } from "@/app/bets/actions";

export default async function EditBetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: bet } = await supabase
    .from("bets")
    .select("*")
    .eq("id", id)
    .single();

  if (!bet) notFound();

  const updateBetWithId = updateBet.bind(null, id);
  const deleteBetWithId = deleteBet.bind(null, id);

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/bets"
        className="mb-4 inline-block text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Back to bets
      </Link>
      <h1 className="mb-4 text-lg font-semibold text-neutral-100">
        Edit bet
      </h1>
      <BetForm
        action={updateBetWithId}
        defaultValues={bet}
        submitLabel="Save changes"
        showStatus
      />
      <form action={deleteBetWithId} className="mt-4">
        <button
          type="submit"
          className="text-sm text-red-400 hover:text-red-300"
        >
          Delete this bet
        </button>
      </form>
    </div>
  );
}
