"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Beaker,
  Bot,
  ClipboardCheck,
  Code2,
  CreditCard,
  FileClock,
  Gauge,
  KeyRound,
  ListChecks,
  MonitorCog,
  Plug,
  ScrollText,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MembershipRole } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatEnumLabel } from "@/lib/format";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: Gauge }],
  },
  {
    label: "Control",
    items: [
      { href: "/agents", label: "Agents", icon: Bot },
      { href: "/policies", label: "Policies", icon: ShieldCheck },
      { href: "/approvals", label: "Approvals", icon: ClipboardCheck },
      { href: "/actions", label: "Actions", icon: ListChecks },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { href: "/audit-logs", label: "Audit Logs", icon: FileClock },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/integrations", label: "Integrations", icon: Plug },
    ],
  },
  {
    label: "Developer",
    items: [
      { href: "/developer/api-keys", label: "API Keys", icon: KeyRound },
      { href: "/developer/docs", label: "Docs", icon: ScrollText },
      { href: "/developer/agent-lab", label: "Agent Lab", icon: Beaker },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/billing", label: "Billing", icon: CreditCard },
    ],
  },
];

const platformItems: NavItem[] = [
  { href: "/platform", label: "Platform", icon: MonitorCog },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  organizationName,
  role,
}: {
  organizationName: string;
  role: MembershipRole;
}) {
  const pathname = usePathname();
  const groups =
    role === "platform_owner"
      ? [...navGroups, { label: "Platform", items: platformItems }]
      : navGroups;

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-white lg:flex">
      <div className="border-b border-slate-800 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-950/30">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-lg font-semibold leading-none">AgentGate</p>
            <p className="mt-1 text-xs text-slate-400">
              Safety, approval, and audit for AI agents.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-200" tone="blue">
            Demo environment
          </Badge>
          <Badge className="border-slate-700 bg-slate-900 text-slate-300" tone="slate">
            Local rules
          </Badge>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {group.label}
            </p>
            <div className="mt-2 grid gap-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
                      active
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white",
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    <Icon
                      className={cn("h-4 w-4", active ? "text-blue-700" : "text-slate-500")}
                      aria-hidden
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 px-6 py-5 text-sm">
        <p className="truncate font-semibold text-white">{organizationName}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-slate-400">{formatEnumLabel(role)}</span>
          <Code2 className="h-4 w-4 text-slate-500" aria-hidden />
        </div>
      </div>
    </aside>
  );
}

export function MobileNav({ role }: { role: MembershipRole }) {
  const pathname = usePathname();
  const groups =
    role === "platform_owner"
      ? [...navGroups, { label: "Platform", items: platformItems }]
      : navGroups;
  const items = groups.flatMap((group) => group.items);

  return (
    <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
      {items.map((item) => (
        <Link
          className={cn(
            "whitespace-nowrap rounded-md border px-3 py-2 text-sm font-medium",
            isActive(pathname, item.href)
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-white text-slate-700",
          )}
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
