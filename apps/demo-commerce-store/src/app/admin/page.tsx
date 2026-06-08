import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { formatCurrency } from "@/lib/format";
import { readStore, safeAdminConfig } from "@/lib/store";

export default function AdminHomePage() {
  const store = readStore();
  const config = safeAdminConfig();
  const totalRevenue = store.orders.reduce((sum, order) => sum + order.total, 0);
  const checkoutOrders = store.orders.filter((order) => order.createdThroughCheckout);

  return (
    <AdminShell>
      <div className="section-title">
        <div>
          <h1>Commerce demo admin</h1>
          <p className="muted">Local order state and AgentGate agent activity for Northstar.</p>
        </div>
      </div>
      <div className="grid three">
        <section className="card">
          <h2>{checkoutOrders.length}</h2>
          <p className="muted">Checkout-created orders</p>
        </section>
        <section className="card">
          <h2>{formatCurrency(totalRevenue)}</h2>
          <p className="muted">Local demo order value</p>
        </section>
        <section className="card">
          <h2>{config.keyConfigured ? "Configured" : "Missing key"}</h2>
          <p className="muted">AgentGate API connection</p>
        </section>
      </div>
      <div className="button-row">
        <Link className="button" href="/admin/api">
          Configure AgentGate
        </Link>
        <Link className="button secondary" href="/admin/agent-logs">
          View agent logs
        </Link>
      </div>
    </AdminShell>
  );
}
