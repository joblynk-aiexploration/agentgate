import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { readStore, safeAdminConfig } from "@/lib/store";
import { metricsForStore } from "@/lib/tracking";
import type { AgentLog, Order } from "@/lib/types";

export default function AdminHomePage() {
  const store = readStore();
  const config = safeAdminConfig();
  const metrics = metricsForStore(store);
  const orderColumns: DataTableColumn<Order>[] = [
    { header: "Order", cell: (order) => <><strong>{order.number}</strong><br /><span className="muted">{formatDate(order.createdAt)}</span></> },
    { header: "Customer", cell: (order) => <>{order.customerName}<br /><span className="muted">{order.email}</span></> },
    { header: "Status", cell: (order) => <StatusBadge status={order.status} /> },
    { header: "Total", cell: (order) => formatCurrency(order.total) },
    { header: "Action", cell: (order) => <Link className="button secondary" href={`/admin/orders/${order.number}`}>Open</Link> },
  ];
  const logColumns: DataTableColumn<AgentLog>[] = [
    { header: "Time", cell: (log) => formatDate(log.timestamp) },
    { header: "Intent", cell: (log) => log.intent },
    { header: "Decision", cell: (log) => log.decision ?? "none" },
    { header: "Result", cell: (log) => log.result },
  ];

  return (
    <AdminShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Commerce operations dashboard</h1>
          <p className="muted">Local orders, fulfillment posture, customer support actions, and AgentGate safety state.</p>
        </div>
        <span className={config.keyConfigured ? "badge badge-success" : "badge badge-danger"}>
          AgentGate {config.keyConfigured ? "configured" : "missing"}
        </span>
      </div>
      <div className="grid four">
        <MetricCard label="Total orders" value={metrics.totalOrders} detail={`${metrics.ordersToday} today`} />
        <MetricCard label="Revenue demo total" value={formatCurrency(metrics.revenue)} detail={`AOV ${metrics.averageOrderValue}`} />
        <MetricCard label="Processing" value={metrics.processingOrders} detail="Fulfillment queue" />
        <MetricCard label="Approval required" value={metrics.pendingApprovals} detail="AgentGate actions" />
        <MetricCard label="Blocked actions" value={metrics.blockedActions} detail="Safety policy results" />
        <MetricCard label="Receipts" value={metrics.receiptsResent} detail="Preview-only records" />
        <MetricCard label="Pending cancels" value={metrics.pendingCancellations} detail="Awaiting reviewer" />
        <MetricCard label="Pending returns" value={metrics.pendingReturns} detail="Local demo state" />
      </div>
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="grid two">
          <section>
            <div className="section-title">
              <h2>Recent orders</h2>
              <Link className="button secondary" href="/admin/orders">All orders</Link>
            </div>
            <DataTable columns={orderColumns} rows={store.orders.slice(0, 6)} />
          </section>
          <section>
            <div className="section-title">
              <h2>Recent agent activity</h2>
              <Link className="button secondary" href="/admin/agent-logs">Agent logs</Link>
            </div>
            <DataTable columns={logColumns} rows={store.agentLogs.slice(0, 6)} />
          </section>
        </div>
      </section>
    </AdminShell>
  );
}
