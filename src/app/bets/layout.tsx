import { SignOutButton } from "@/components/sign-out-button";

export default function BetsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <span className="text-sm font-semibold tracking-wide text-neutral-100">
          Bet Tracker
        </span>
        <SignOutButton />
      </header>
      <main className="flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
