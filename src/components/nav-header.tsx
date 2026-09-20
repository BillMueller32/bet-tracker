"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/bets", label: "Bets" },
  { href: "/analytics", label: "Analytics" },
  { href: "/insights", label: "Insights" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/bets") {
    // Everything under /bets except the top-level list itself belongs to
    // its own flow (add/edit/screenshot), not the "Bets" tab.
    return pathname === "/bets";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-neutral-800">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <span className="text-sm font-semibold tracking-wide text-neutral-100">
          Bet Tracker
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className={`text-sm font-medium ${
              isActive(pathname, "/settings")
                ? "text-neutral-100"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Settings
          </Link>
          <SignOutButton />
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2">
        {NAV_LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
