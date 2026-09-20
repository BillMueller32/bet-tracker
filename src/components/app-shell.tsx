import { NavHeader } from "@/components/nav-header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
