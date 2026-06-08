import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { Badge } from "@/components/ui/badge";
import { DetailRow } from "@/components/ui/detail-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timeline } from "@/components/ui/timeline";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatCurrency, formatDate } from "@/lib/format";
import { findOrderForCustomer, readStore } from "@/lib/store";
import { customerEvents, demoTrackingNumber, estimatedDelivery, recentAgentLogsForOrder } from "@/lib/tracking";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const customer = await getCurrentCustomer();

  if (!customer) {
    redirect("/login?returnTo=/account/orders");
  }

  const { orderNumber } = await params;
  const store = readStore();
  const order = findOrderForCustomer(orderNumber, customer.id);

  if (!order) {
    notFound();
  }

  const logs = recentAgentLogsForOrder(store.agentLogs, order);

  return (
    <CustomerShell customer={customer}>
      <div className="page-header">
        <div>
          <p className="eyebrow">Order detail</p>
          <h1>{order.number}</h1>
          <p className="muted">{formatDate(order.createdAt)} · Demo payment ending {order.paymentLast4 ?? "4242"}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="grid main-aside">
        <section className="card">
          <h2>Items and totals</h2>
          <div className="stack">
            {order.items.map((item) => (
              <div className="line-item" key={`${order.id}-${item.productId}`}>
                <span><strong>{item.name}</strong><br /><span className="muted">{formatCurrency(item.price)} x {item.quantity}</span></span>
                <strong>{formatCurrency(item.price * item.quantity)}</strong>
              </div>
            ))}
          </div>
          <dl className="summary-list">
            <div><dt>Subtotal</dt><dd>{formatCurrency(order.subtotal)}</dd></div>
            <div><dt>Tax</dt><dd>{formatCurrency(order.tax)}</dd></div>
            <div><dt>Shipping</dt><dd>{order.shipping ? formatCurrency(order.shipping) : "Free"}</dd></div>
            <div className="summary-total"><dt>Total</dt><dd>{formatCurrency(order.total)}</dd></div>
          </dl>
          <h2>Tracking timeline</h2>
          <Timeline events={customerEvents(order)} />
        </section>
        <aside className="stack">
          <section className="card">
            <h2>Fulfillment</h2>
            <DetailRow label="Tracking" value={demoTrackingNumber(order)} />
            <DetailRow label="Carrier" value="Northstar Demo Logistics" />
            <DetailRow label="Estimated delivery" value={estimatedDelivery(order)} />
            <DetailRow label="Payment status" value="Authorized demo" />
            {order.pendingApprovalRequestId ? <Badge tone="warning">AgentGate approval pending</Badge> : null}
          </section>
          <section className="card">
            <h2>Shipping address</h2>
            <p>
              <strong>{order.shippingAddress.fullName}</strong><br />
              {order.shippingAddress.addressLine1}
              {order.shippingAddress.addressLine2 ? <><br />{order.shippingAddress.addressLine2}</> : null}<br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}<br />
              {order.shippingAddress.country}
            </p>
          </section>
          <section className="card">
            <h2>Support actions</h2>
            <p className="muted">Use the assistant to request cancellation, return, receipt resend, or address update. Business actions go through AgentGate.</p>
            <div className="button-row">
              <Link className="button secondary" href="/account/support">Ask assistant</Link>
              <Link className="button secondary" href="/account/receipts">Receipts</Link>
            </div>
          </section>
          <section className="card">
            <h2>Agent activity</h2>
            {logs.length ? (
              <div className="stack">
                {logs.slice(0, 4).map((log) => (
                  <div className="event" key={log.id}>
                    <strong>{log.intent}</strong>
                    <p>{log.result}</p>
                    <span className="muted">{log.decision ?? "no decision"} · {log.riskLevel ?? "n/a"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No support-agent actions for this order yet.</p>
            )}
          </section>
        </aside>
      </div>
    </CustomerShell>
  );
}
