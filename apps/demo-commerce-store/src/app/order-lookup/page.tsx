import { formatCurrency } from "@/lib/format";
import { findOrder } from "@/lib/store";
import { customerEvents, demoTrackingNumber, estimatedDelivery } from "@/lib/tracking";
import { DetailRow } from "@/components/ui/detail-row";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timeline } from "@/components/ui/timeline";

export default async function OrderLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; order?: string }>;
}) {
  const params = await searchParams;
  const order = params.order && params.email ? findOrder(params.order, params.email) : null;

  return (
    <main className="section">
      <div className="container grid main-aside">
        <form className="card form" method="get">
          <PageHeader eyebrow="Tracking" title="Track a Northstar order" description="Enter both the order number and email address. Orders are only shown when both values match local demo data." />
          <input className="input" name="order" placeholder="NS-2001" defaultValue={params.order ?? ""} />
          <input className="input" name="email" placeholder="customer@northstar-demo.dev" defaultValue={params.email ?? ""} />
          <button className="button" type="submit">Lookup order</button>
        </form>
        <section className="card">
          {order ? (
            <>
              <div className="section-title">
                <div>
                  <h2>{order.number}</h2>
                  <p className="muted">{order.email}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <DetailRow label="Tracking number" value={demoTrackingNumber(order)} />
              <DetailRow label="Carrier" value="Northstar Demo Logistics" />
              <DetailRow label="Estimated delivery" value={estimatedDelivery(order)} />
              <DetailRow label="Total" value={formatCurrency(order.total)} />
              <h3>Timeline</h3>
              <Timeline events={customerEvents(order)} />
            </>
          ) : (
            <>
              <h2>Order verification required</h2>
              <p className="muted">Create a checkout order first, then use that order number with the matching customer email.</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
