import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timeline } from "@/components/ui/timeline";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatCurrency, formatDate } from "@/lib/format";
import { listOrdersForCustomer, readStore } from "@/lib/store";
import { customerEvents, itemCount, latestOrderEvent, receiptsForCustomer } from "@/lib/tracking";

export default async function AccountPage() {
  const customer = await getCurrentCustomer();

  if (!customer) {
    redirect("/login?returnTo=/account");
  }

  const store = readStore();
  const orders = listOrdersForCustomer(customer.id);
  const latest = orders[0];
  const receipts = receiptsForCustomer(store.receipts, customer.email);
  const pending = orders.filter((order) => order.pendingApprovalRequestId);

  return (
    <CustomerShell customer={customer}>
      <div className="page-header">
        <div>
          <p className="eyebrow">Customer dashboard</p>
          <h1>Welcome back, {customer.name}</h1>
          <p className="muted">Track orders, receipts, and support-agent activity tied to your local checkout history.</p>
        </div>
      </div>
      <div className="grid three">
        <MetricCard label="Orders" value={orders.length} detail="Local checkout history" />
        <MetricCard label="Pending approvals" value={pending.length} detail="AgentGate-reviewed actions" />
        <MetricCard label="Receipts" value={receipts.length} detail="Preview-only records" />
      </div>
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="grid two">
          <section className="card">
            <h2>Latest order</h2>
            {latest ? (
              <>
                <div className="section-title">
                  <div>
                    <h3>{latest.number}</h3>
                    <p className="muted">{formatDate(latest.createdAt)} · {itemCount(latest)} item(s)</p>
                  </div>
                  <StatusBadge status={latest.status} />
                </div>
                <p><strong>{formatCurrency(latest.total)}</strong></p>
                {latestOrderEvent(latest) ? <Timeline events={customerEvents(latest).slice(0, 3)} /> : null}
                <div className="button-row">
                  <Link className="button" href={`/account/orders/${latest.number}`}>View details</Link>
                  <Link className="button secondary" href="/account/tracking">Track latest</Link>
                </div>
              </>
            ) : (
              <p className="muted">No orders yet. Checkout first, then ask the assistant about your latest order.</p>
            )}
          </section>
          <section className="card">
            <h2>Quick actions</h2>
            <div className="button-row">
              <Link className="button" href="/products">Shop products</Link>
              <Link className="button secondary" href="/account/orders">View orders</Link>
              <Link className="button secondary" href="/account/support">Ask assistant</Link>
              <Link className="button secondary" href="/account/receipts">Receipts</Link>
            </div>
            <p className="muted">Cancellation, return, receipt, and address-change actions are routed through AgentGate when they can affect order state.</p>
          </section>
        </div>
      </section>
    </CustomerShell>
  );
}
