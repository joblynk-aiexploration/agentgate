import Link from "next/link";
import {
  BarChart3,
  Bot,
  ClipboardCheck,
  CreditCard,
  FileClock,
  Gauge,
  KeyRound,
  Plug,
  ScrollText,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { requireMembership } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/policies", label: "Policies", icon: ShieldCheck },
  { href: "/approvals", label: "Approvals", icon: ClipboardCheck },
  { href: "/audit-logs", label: "Audit Logs", icon: FileClock },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/developer", label: "Developer", icon: KeyRound },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const membership = await requireMembership();

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] text-[#16181d]">
      <aside className="hidden w-72 shrink-0 flex-col bg-[#172326] text-white lg:flex">
        <div className="border-b border-[#2b4247] px-6 py-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-[#8fc7bd]" aria-hidden />
            <span className="text-lg font-semibold">AgentGate</span>
          </div>
          <p className="mt-3 text-xs uppercase tracking-wide text-[#9db7bb]">
            Protected workspace
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[#d8eeee] transition hover:bg-[#22363b]"
                href={item.href}
                key={item.href}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#2b4247] px-6 py-5 text-sm text-[#c8d6d8]">
          <p className="font-semibold text-white">{membership.organization.name}</p>
          <p className="mt-1">{membership.role}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-[#d9dee8] bg-white px-5 py-4 shadow-sm sm:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#4c6f68]">
                {membership.organization.name}
              </p>
              <p className="mt-1 text-sm text-[#5c6470]">
                Signed in as {membership.user.name ?? membership.user.email}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex items-center gap-2 border border-[#cbd3df] bg-white px-3 py-2 text-sm font-semibold text-[#172326] transition hover:bg-[#f5f7fb]"
                href="/developer/api-keys"
              >
                <KeyRound className="h-4 w-4" aria-hidden />
                API Keys
              </Link>
              <form action="/logout" method="post">
                <button
                  className="inline-flex items-center gap-2 bg-[#172326] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#22363b]"
                  type="submit"
                >
                  <ScrollText className="h-4 w-4" aria-hidden />
                  Logout
                </button>
              </form>
            </div>
          </div>

          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {navItems.map((item) => (
              <Link
                className="whitespace-nowrap border border-[#d9dee8] px-3 py-2 text-sm font-medium text-[#172326]"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="min-w-0 flex-1 px-5 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
