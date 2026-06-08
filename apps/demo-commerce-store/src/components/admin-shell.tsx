import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminLoggedIn } from "@/lib/admin-auth";

export async function AdminShell({ children }: { children: React.ReactNode }) {
  if (!(await isAdminLoggedIn())) {
    redirect("/admin/login");
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <strong>Northstar Admin</strong>
        <nav>
          <Link href="/admin">Overview</Link>
          <Link href="/admin/orders">Orders</Link>
          <Link href="/admin/products">Products</Link>
          <Link href="/admin/api">AgentGate API</Link>
          <Link href="/admin/agent-logs">Agent logs</Link>
          <Link href="/admin/logout">Logout</Link>
        </nav>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
