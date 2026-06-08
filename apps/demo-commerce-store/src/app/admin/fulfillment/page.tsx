import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { readStore } from "@/lib/store";
import type { Order } from "@/lib/types";

const lanes: Order["status"][] = ["processing", "packed", "shipped", "delivered", "cancelled"];

export default function AdminFulfillmentPage() {
  const orders = readStore().orders;

  return (
    <AdminShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">Fulfillment</p>
          <h1>Demo fulfillment board</h1>
          <p className="muted">Move local orders through fulfillment states. No carrier integrations are contacted.</p>
        </div>
      </div>
      <div className="grid five" style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 16 }}>
        {lanes.map((lane) => (
          <section className="card" key={lane}>
            <StatusBadge status={lane} />
            <h2>{lane}</h2>
            <div className="stack">
              {orders.filter((order) => order.status === lane).map((order) => (
                <Link className="card" href={`/admin/orders/${order.number}`} key={order.id}>
                  <strong>{order.number}</strong>
                  <p className="muted">{order.customerName}</p>
                  <span>{formatCurrency(order.total)}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AdminShell>
  );
}
