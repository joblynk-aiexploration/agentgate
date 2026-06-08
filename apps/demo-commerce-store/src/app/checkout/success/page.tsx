import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatCurrency } from "@/lib/format";
import { findOrderForCustomer } from "@/lib/store";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const customer = await getCurrentCustomer();

  if (!customer) {
    redirect("/login");
  }

  const params = await searchParams;
  const order = params.order ? findOrderForCustomer(params.order, customer.id) : null;

  if (!order) {
    redirect("/account/orders");
  }

  return (
    <main className="section">
      <div className="container grid two">
        <section className="card">
          <div className="badge">Order created</div>
          <h1>Thanks, {customer.name}</h1>
          <p>
            Your local demo order <strong>{order.number}</strong> was created for {customer.email}.
          </p>
          <p className="muted">A receipt preview was recorded locally. No email was sent and no payment was processed.</p>
          <div className="button-row">
            <Link className="button" href={`/account/orders/${order.number}`}>
              View order
            </Link>
            <Link className="button secondary" href="/products">
              Keep shopping
            </Link>
          </div>
        </section>
        <aside className="card">
          <h2>Receipt summary</h2>
          <div className="stack">
            {order.items.map((item) => (
              <div className="line-item" key={item.productId}>
                <span>
                  {item.name} x {item.quantity}
                </span>
                <strong>{formatCurrency(item.price * item.quantity)}</strong>
              </div>
            ))}
          </div>
          <h3>Total: {formatCurrency(order.total)}</h3>
          <p className="muted">Open the chat widget and ask “Cancel my latest order” to watch AgentGate review this actual checkout order.</p>
        </aside>
      </div>
    </main>
  );
}
