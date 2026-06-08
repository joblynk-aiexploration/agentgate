import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { DetailRow } from "@/components/ui/detail-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timeline } from "@/components/ui/timeline";
import { formatCurrency, formatDate } from "@/lib/format";
import { readStore } from "@/lib/store";
import { demoTrackingNumber, estimatedDelivery, recentAgentLogsForOrder } from "@/lib/tracking";

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const { orderNumber } = await params;
  const qs = await searchParams;
  const store = readStore();
  const order = store.orders.find((item) => item.number.toLowerCase() === orderNumber.toLowerCase());

  if (!order) {
    notFound();
  }

  const logs = recentAgentLogsForOrder(store.agentLogs, order);

  return (
    <AdminShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">Order detail</p>
          <h1>{order.number}</h1>
          <p className="muted">{order.customerName} · {order.email} · {formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      {qs.updated ? <div className="alert alert-success">Order updated.</div> : null}
      {qs.error ? <div className="alert alert-danger">Could not update order.</div> : null}
      <div className="grid main-aside">
        <section className="card">
          <h2>Items</h2>
          {order.items.map((item) => (
            <div className="line-item" key={item.productId}>
              <span><strong>{item.name}</strong><br /><span className="muted">{formatCurrency(item.price)} x {item.quantity}</span></span>
              <strong>{formatCurrency(item.price * item.quantity)}</strong>
            </div>
          ))}
          <dl className="summary-list">
            <div><dt>Subtotal</dt><dd>{formatCurrency(order.subtotal)}</dd></div>
            <div><dt>Tax</dt><dd>{formatCurrency(order.tax)}</dd></div>
            <div><dt>Shipping</dt><dd>{order.shipping ? formatCurrency(order.shipping) : "Free"}</dd></div>
            <div className="summary-total"><dt>Total</dt><dd>{formatCurrency(order.total)}</dd></div>
          </dl>
          <h2>Order event timeline</h2>
          <Timeline events={order.events} />
        </section>
        <aside className="stack">
          <section className="card">
            <h2>Fulfillment controls</h2>
            <form className="form" action={`/api/admin/orders/${order.number}/status`} method="post">
              <select className="select" name="status" defaultValue={order.status}>
                <option value="processing">processing</option>
                <option value="packed">packed</option>
                <option value="shipped">shipped</option>
                <option value="delivered">delivered</option>
                <option value="cancelled">cancelled</option>
              </select>
              <button className="button" type="submit">Update fulfillment status</button>
            </form>
          </section>
          <section className="card">
            <h2>Tracking</h2>
            <DetailRow label="Tracking number" value={demoTrackingNumber(order)} />
            <DetailRow label="ETA" value={estimatedDelivery(order)} />
            <DetailRow label="Carrier" value="Northstar Demo Logistics" />
            <DetailRow label="Payment" value={`Demo authorized ${order.paymentLast4 ?? "4242"}`} />
          </section>
          <section className="card">
            <h2>AgentGate section</h2>
            <DetailRow label="Action request" value={order.pendingActionRequestId ?? "none"} />
            <DetailRow label="Approval request" value={order.pendingApprovalRequestId ?? "none"} />
            <Link className="button secondary" href="http://localhost:3001/integrations/demo-commerce">Open AgentGate monitor</Link>
          </section>
          <section className="card">
            <h2>Add note</h2>
            <form className="form" action={`/api/admin/orders/${order.number}/note`} method="post">
              <textarea className="textarea" name="note" placeholder="Internal or customer-visible note" />
              <select className="select" name="visibility" defaultValue="internal">
                <option value="internal">Internal only</option>
                <option value="customer">Customer-visible tracking note</option>
              </select>
              <button className="button secondary" type="submit">Add note</button>
            </form>
          </section>
          <section className="card">
            <h2>Agent activity</h2>
            {logs.length ? logs.slice(0, 5).map((log) => (
              <div className="event" key={log.id}>
                <strong>{log.intent}</strong>
                <p>{log.result}</p>
                <span className="muted">{log.decision ?? "none"} · {log.actionRequestId ?? "no action"}</span>
              </div>
            )) : <p className="muted">No agent activity for this order.</p>}
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}
