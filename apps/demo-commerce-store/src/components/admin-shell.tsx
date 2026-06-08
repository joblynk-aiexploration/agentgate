import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminLoggedIn } from "@/lib/admin-auth";

const navGroups = [
  {
    label: "Overview",
    links: [{ href: "/admin", label: "Dashboard" }],
  },
  {
    label: "Commerce",
    links: [
      { href: "/admin/orders", label: "Orders" },
      { href: "/admin/products", label: "Products" },
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/fulfillment", label: "Fulfillment" },
      { href: "/admin/tracking", label: "Tracking" },
    ],
  },
  {
    label: "AI Support",
    links: [
      { href: "/admin/agent-logs", label: "Agent logs" },
      { href: "/admin/api", label: "AgentGate API" },
    ],
  },
  {
    label: "Settings",
    links: [
      { href: "/admin/settings", label: "Store settings" },
      { href: "/admin/logout", label: "Logout" },
    ],
  },
];

export async function AdminShell({ children }: { children: React.ReactNode }) {
  if (!(await isAdminLoggedIn())) {
    redirect("/admin/login");
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <strong>Northstar Admin</strong>
        <small>Production demo environment</small>
        <nav aria-label="Admin navigation">
          {navGroups.map((group) => (
            <div className="admin-nav-group" key={group.label}>
              <span>{group.label}</span>
              {group.links.map((link) => (
                <Link href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <strong>Admin workspace</strong>
            <p className="muted" style={{ margin: 0 }}>
              Local demo only. No real payments, emails, shipping, or external tools.
            </p>
          </div>
          <span className="badge badge-info">AgentGate monitored</span>
        </div>
        {children}
      </main>
    </div>
  );
}
