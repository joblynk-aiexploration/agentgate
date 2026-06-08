import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timeline } from "@/components/ui/timeline";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatDate } from "@/lib/format";
import { listOrdersForCustomer } from "@/lib/store";
import { customerEvents, demoTrackingNumber, estimatedDelivery } from "@/lib/tracking";

export default async function CustomerTrackingPage() {
  const customer = await getCurrentCustomer();

  if (!customer) {
    redirect("/login?returnTo=/account/tracking");
  }

  const orders = listOrdersForCustomer(customer.id);

  return (
    <CustomerShell customer={customer}>
      <div className="page-header">
        <div>
          <p className="eyebrow">Tracking</p>
          <h1>Order tracking</h1>
          <p className="muted">Tracking events come from real local order data and support-agent updates.</p>
        </div>
      </div>
      {orders.length ? (
        <div className="stack">
          {orders.map((order) => (
            <section className="card" key={order.id}>
              <div className="section-title">
                <div>
                  <h2>{order.number}</h2>
                  <p className="muted">{demoTrackingNumber(order)} · ETA {estimatedDelivery(order)} · Created {formatDate(order.createdAt)}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <Timeline events={customerEvents(order)} />
              <Link className="button secondary" href={`/account/orders/${order.number}`}>Open order</Link>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title="No tracking yet" description="Create a checkout order to see a fulfillment timeline." actionHref="/products" actionLabel="Shop products" />
      )}
    </CustomerShell>
  );
}
