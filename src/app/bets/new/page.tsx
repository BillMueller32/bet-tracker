import Link from "next/link";
import { BetForm } from "@/components/bet-form";
import { createBet } from "@/app/bets/actions";

export default function NewBetPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/bets"
        className="mb-4 inline-block text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Back to bets
      </Link>
      <h1 className="mb-4 text-lg font-semibold text-neutral-100">
        Add a bet
      </h1>
      <BetForm action={createBet} submitLabel="Add bet" />
    </div>
  );
}
