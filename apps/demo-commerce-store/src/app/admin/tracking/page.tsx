import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Timeline } from "@/components/ui/timeline";
import { readStore } from "@/lib/store";
import { demoTrackingNumber, estimatedDelivery } from "@/lib/tracking";

export default function AdminTrackingPage() {
  const orders = readStore().orders;

  return (
    <AdminShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">Tracking</p>
          <h1>Tracking operations</h1>
          <p className="muted">Inspect customer-visible and internal events from local order data.</p>
        </div>
      </div>
      <div className="stack">
        {orders.map((order) => (
          <section className="card" key={order.id}>
            <div className="section-title">
              <div>
                <h2>{order.number}</h2>
                <p className="muted">{demoTrackingNumber(order)} · ETA {estimatedDelivery(order)}</p>
              </div>
              <Link className="button secondary" href={`/admin/orders/${order.number}`}>Open</Link>
            </div>
            <Timeline events={order.events.slice(0, 5)} />
          </section>
        ))}
      </div>
    </AdminShell>
  );
}
