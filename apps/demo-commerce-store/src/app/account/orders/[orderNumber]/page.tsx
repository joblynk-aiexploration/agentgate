import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";
import { findOrderForCustomer } from "@/lib/store";

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
  const order = findOrderForCustomer(orderNumber, customer.id);

  if (!order) {
    notFound();
  }

  return (
    <main className="section">
      <div className="container grid two">
        <section className="card">
          <div className="section-title">
            <div>
              <h1>{order.number}</h1>
              <p className="muted">{formatDate(order.createdAt)}</p>
            </div>
            <span className="badge">{titleCase(order.status)}</span>
          </div>
          <div className="stack">
            {order.items.map((item) => (
              <div className="line-item" key={`${order.id}-${item.productId}`}>
                <span>
                  <strong>{item.name}</strong>
                  <br />
                  <span className="muted">
                    {formatCurrency(item.price)} x {item.quantity}
                  </span>
                </span>
                <strong>{formatCurrency(item.price * item.quantity)}</strong>
              </div>
            ))}
          </div>
          <dl className="summary-list">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatCurrency(order.subtotal)}</dd>
            </div>
            <div>
              <dt>Tax</dt>
              <dd>{formatCurrency(order.tax)}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>{order.shipping ? formatCurrency(order.shipping) : "Free"}</dd>
            </div>
            <div className="summary-total">
              <dt>Total</dt>
              <dd>{formatCurrency(order.total)}</dd>
            </div>
          </dl>
        </section>
        <aside className="card">
          <h2>Shipping and support</h2>
          <p>
            <strong>{order.shippingAddress.fullName}</strong>
            <br />
            {order.shippingAddress.addressLine1}
            {order.shippingAddress.addressLine2 ? (
              <>
                <br />
                {order.shippingAddress.addressLine2}
              </>
            ) : null}
            <br />
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
            <br />
            {order.shippingAddress.country}
          </p>
          <p className="muted">
            Payment is demo-only{order.paymentLast4 ? `, ending in ${order.paymentLast4}` : ""}. No real charge was made.
          </p>
          {order.pendingApprovalRequestId ? (
            <p className="badge">Cancellation pending AgentGate approval</p>
          ) : null}
          <h3>Events</h3>
          <div className="stack">
            {order.events.map((event) => (
              <div className="event" key={event.id}>
                <strong>{titleCase(event.type)}</strong>
                <p>{event.message}</p>
                <span className="muted">{formatDate(event.createdAt)}</span>
              </div>
            ))}
          </div>
          <p className="muted">Try asking the assistant: “Cancel my latest order.”</p>
          <Link className="button secondary" href="/account/orders">
            Back to orders
          </Link>
        </aside>
      </div>
    </main>
  );
}
