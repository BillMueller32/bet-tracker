import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BetForm } from "@/components/bet-form";
import { DeleteBetButton } from "@/components/delete-bet-button";
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
    .select("*, bet_legs(*)")
    .eq("id", id)
    .order("leg_order", { referencedTable: "bet_legs" })
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
      <DeleteBetButton deleteAction={deleteBetWithId} />
    </div>
  );
}
