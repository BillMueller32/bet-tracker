import { setBetStatus } from "@/app/bets/actions";

const QUICK_ACTIONS: { status: string; label: string; className: string }[] = [
  { status: "won", label: "Won", className: "bg-green-950 text-green-300 hover:bg-green-900" },
  { status: "lost", label: "Lost", className: "bg-red-950 text-red-300 hover:bg-red-900" },
  { status: "push", label: "Push", className: "bg-blue-950 text-blue-300 hover:bg-blue-900" },
  {
    status: "cancelled",
    label: "Void",
    className: "bg-neutral-800 text-neutral-400 hover:bg-neutral-700",
  },
];

// Rendered as a sibling to the card's own <Link>, not nested inside it —
// a <button> inside an <a> is invalid HTML and would also mean every tap
// here also navigates to the edit page. Each action is its own bound
// server action + form, same pattern as DeleteBetButton, so this needs
// no client-side state of its own.
export function SettleBetButtons({ betId }: { betId: string }) {
  return (
    <div className="flex gap-1.5">
      {QUICK_ACTIONS.map((action) => (
        <form
          key={action.status}
          action={setBetStatus.bind(null, betId, action.status)}
          className="flex-1"
        >
          <button
            type="submit"
            className={`w-full rounded-md px-2 py-2 text-xs font-semibold transition-colors ${action.className}`}
          >
            {action.label}
          </button>
        </form>
      ))}
    </div>
  );
}
