import Link from "next/link";
import {
  BarChart3,
  ListChecks,
  Bot,
  ClipboardCheck,
  CreditCard,
  FileClock,
  Gauge,
  KeyRound,
  Plug,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { MembershipRole } from "@/generated/prisma/client";
import { formatEnumLabel } from "@/lib/format";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/actions", label: "Actions", icon: ListChecks },
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

export function Sidebar({
  organizationName,
  role,
}: {
  organizationName: string;
  role: MembershipRole;
}) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col bg-[#162126] text-white lg:flex">
      <div className="border-b border-[#2b4247] px-6 py-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-[#8fc7bd]" aria-hidden />
          <span className="text-lg font-semibold">AgentGate</span>
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#8fa8ad]">
          Enterprise console
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
        <p className="truncate font-semibold text-white">{organizationName}</p>
        <p className="mt-1">{formatEnumLabel(role)}</p>
      </div>
    </aside>
  );
}

export function MobileNav() {
  return (
    <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
      {navItems.map((item) => (
        <Link
          className="whitespace-nowrap border border-[#d9dee8] bg-white px-3 py-2 text-sm font-medium text-[#172326]"
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
