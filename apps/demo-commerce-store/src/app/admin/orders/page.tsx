import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { readStore } from "@/lib/store";
import { itemCount } from "@/lib/tracking";
import type { Order } from "@/lib/types";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ checked?: string; customer?: string; status?: string; synced?: string; syncError?: string }>;
}) {
  const params = await searchParams;
  const store = readStore();
  const statuses = Array.from(new Set(store.orders.map((order) => order.status)));
  const customerQuery = params.customer?.toLowerCase() ?? "";
  const orders = store.orders
    .filter((order) => !params.status || order.status === params.status)
    .filter((order) => customerQuery ? `${order.number} ${order.email} ${order.customerName}`.toLowerCase().includes(customerQuery) : true);
  const columns: DataTableColumn<Order>[] = [
    { header: "Order", cell: (order) => <><strong>{order.number}</strong><br /><span className="muted">{formatDate(order.createdAt)}</span><br /><span className="badge">{order.createdThroughCheckout ? "Checkout" : "Fixture"}</span></> },
    { header: "Customer", cell: (order) => <>{order.customerName}<br /><span className="muted">{order.email}</span></> },
    { header: "Status", cell: (order) => <StatusBadge status={order.status} /> },
    { header: "Total", cell: (order) => formatCurrency(order.total) },
    { header: "Items", cell: (order) => `${itemCount(order)} item(s)` },
    { header: "AgentGate", cell: (order) => order.pendingApprovalRequestId ? <span className="badge badge-warning">Pending approval</span> : "No pending action" },
    { header: "Action", cell: (order) => <Link className="button secondary" href={`/admin/orders/${order.number}`}>Open</Link> },
  ];

  return (
    <AdminShell>
      <div className="section-title">
        <div>
          <p className="eyebrow">Commerce</p>
          <h1>Orders</h1>
          <p className="muted">Search, filter, inspect, and sync AgentGate-approved local demo actions.</p>
        </div>
        <form action="/api/admin/orders/sync-agentgate" method="post">
          <button className="button" type="submit">Sync approved AgentGate actions</button>
        </form>
      </div>
      {params.synced ? <div className="alert alert-success"><strong>AgentGate sync complete.</strong> Checked {params.checked ?? "0"} pending order(s); executed {params.synced} approved local demo action(s).</div> : null}
      {params.syncError ? <div className="alert alert-danger"><strong>AgentGate sync failed.</strong> {params.syncError}</div> : null}
      <form className="card form" method="get" style={{ marginBottom: 18 }}>
        <div className="grid three">
          <label>Search<input className="input" name="customer" placeholder="Order, email, customer" defaultValue={params.customer ?? ""} /></label>
          <label>Status<select className="select" name="status" defaultValue={params.status ?? ""}><option value="">All statuses</option>{statuses.map((status) => <option value={status} key={status}>{status}</option>)}</select></label>
          <button className="button" type="submit">Apply filters</button>
        </div>
      </form>
      <FilterBar>
        <a href="/admin/orders">All</a>
        {statuses.map((status) => <a href={`/admin/orders?status=${status}`} key={status}>{status}</a>)}
      </FilterBar>
      <DataTable columns={columns} rows={orders} />
    </AdminShell>
  );
}
