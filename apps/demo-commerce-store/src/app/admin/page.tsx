import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { readStore, safeAdminConfig } from "@/lib/store";
import { metricsForStore } from "@/lib/tracking";

export default function AdminHomePage() {
  const store = readStore();
  const config = safeAdminConfig();
  const metrics = metricsForStore(store);
  const recentOrders = store.orders.slice(0, 6);
  const recentLogs = store.agentLogs.slice(0, 6);

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
              <div>
                <p className="eyebrow">Fulfillment queue</p>
                <h2>Recent orders</h2>
              </div>
              <Link className="button secondary" href="/admin/orders">All orders</Link>
            </div>
            <div className="ops-list">
              {recentOrders.map((order) => (
                <Link className="ops-row" href={`/admin/orders/${order.number}`} key={order.id}>
                  <div>
                    <strong>{order.number}</strong>
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                  <div>
                    <strong>{order.customerName}</strong>
                    <span>{order.email}</span>
                  </div>
                  <StatusBadge status={order.status} />
                  <strong className="ops-total">{formatCurrency(order.total)}</strong>
                </Link>
              ))}
            </div>
          </section>
          <section>
            <div className="section-title">
              <div>
                <p className="eyebrow">AgentGate monitored</p>
                <h2>Recent agent activity</h2>
              </div>
              <Link className="button secondary" href="/admin/agent-logs">Agent logs</Link>
            </div>
            <div className="activity-list">
              {recentLogs.map((log) => (
                <article className="activity-card" key={log.id}>
                  <div className="activity-head">
                    <span>{formatDate(log.timestamp)}</span>
                    {log.decision ? <StatusBadge status={log.decision} /> : <span className="badge">No gateway decision</span>}
                  </div>
                  <h3>{log.intent.replaceAll("_", " ")}</h3>
                  <p>{log.result}</p>
                  <div className="activity-meta">
                    <span>{log.customerEmail ?? "anonymous"}</span>
                    <span>{log.orderNumber ?? "no order"}</span>
                    <span>{log.riskLevel ? `${log.riskLevel} risk` : "policy-only"}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </AdminShell>
  );
}
