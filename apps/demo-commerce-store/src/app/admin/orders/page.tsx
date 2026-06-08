import { AdminShell } from "@/components/admin-shell";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";
import { readStore } from "@/lib/store";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ checked?: string; status?: string; synced?: string; syncError?: string }>;
}) {
  const params = await searchParams;
  const store = readStore();
  const statuses = Array.from(new Set(store.orders.map((order) => order.status)));
  const orders = params.status
    ? store.orders.filter((order) => order.status === params.status)
    : store.orders;

  return (
    <AdminShell>
      <div className="section-title">
        <div>
          <h1>Orders</h1>
          <p className="muted">Real local checkout orders and their AgentGate-aware support state.</p>
        </div>
        <form action="/api/admin/orders/sync-agentgate" method="post">
          <button className="button" type="submit">
            Sync approved AgentGate actions
          </button>
        </form>
      </div>
      {params.synced ? (
        <div className="card" style={{ marginBottom: 18, padding: 14 }}>
          <strong>AgentGate sync complete.</strong>{" "}
          Checked {params.checked ?? "0"} pending order(s); executed {params.synced} approved local demo action(s).
        </div>
      ) : null}
      {params.syncError ? (
        <div className="card" style={{ borderColor: "#fecaca", color: "#991b1b", marginBottom: 18, padding: 14 }}>
          <strong>AgentGate sync failed.</strong> {params.syncError}
        </div>
      ) : null}
      <div className="button-row" style={{ marginBottom: 18 }}>
        <a className="badge" href="/admin/orders">
          All
        </a>
        {statuses.map((status) => (
          <a className="badge" href={`/admin/orders?status=${status}`} key={status}>
            {titleCase(status)}
          </a>
        ))}
      </div>
      <table className="table card">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Total</th>
            <th>Items</th>
            <th>AgentGate state</th>
            <th>Events</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <strong>{order.number}</strong>
                <br />
                <span className="muted">{formatDate(order.createdAt)}</span>
                <br />
                <span className="badge">{order.createdThroughCheckout ? "Checkout" : "Fixture"}</span>
              </td>
              <td>
                {order.customerName}
                <br />
                <span className="muted">{order.email}</span>
              </td>
              <td>
                <span className="badge">{titleCase(order.status)}</span>
              </td>
              <td>{formatCurrency(order.total)}</td>
              <td>{order.items.map((item) => `${item.name} x ${item.quantity}`).join(", ")}</td>
              <td>
                {order.pendingApprovalRequestId ? (
                  <>
                    <strong>Pending approval</strong>
                    <br />
                    <span className="muted">{order.pendingApprovalRequestId}</span>
                  </>
                ) : (
                  "No pending approval"
                )}
                {order.agentActions.length ? (
                  <>
                    <br />
                    <span className="muted">{order.agentActions.join("; ")}</span>
                  </>
                ) : null}
              </td>
              <td>
                {order.events.length ? (
                  order.events.slice(0, 3).map((event) => (
                    <div key={event.id}>
                      <strong>{titleCase(event.type)}</strong>
                      <br />
                      <span className="muted">{event.message}</span>
                    </div>
                  ))
                ) : (
                  "None"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}
