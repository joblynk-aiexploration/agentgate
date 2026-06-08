import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatCurrency } from "@/lib/format";
import { getCart, hydrateCart } from "@/lib/store";

export default async function CheckoutPage() {
  const customer = await getCurrentCustomer();

  if (!customer) {
    redirect("/login?returnTo=/checkout");
  }

  const summary = hydrateCart(getCart({ userId: customer.id }));

  if (!summary.items.length) {
    redirect("/cart?empty=1");
  }

  return (
    <main className="section">
      <div className="container grid two">
        <form className="card form" method="post" action="/api/checkout">
          <h1>Demo checkout</h1>
          <p className="muted">Demo checkout only. No real payment is processed.</p>
          <h2>Shipping address</h2>
          <input className="input" name="fullName" placeholder="Full name" defaultValue={customer.name} required />
          <input className="input" name="addressLine1" placeholder="Address line 1" defaultValue="120 Trail Ridge Road" required />
          <input className="input" name="addressLine2" placeholder="Address line 2 (optional)" />
          <div className="grid three">
            <input className="input" name="city" placeholder="City" defaultValue="Austin" required />
            <input className="input" name="state" placeholder="State" defaultValue="TX" required />
            <input className="input" name="zip" placeholder="ZIP" defaultValue="78701" required />
          </div>
          <input className="input" name="country" placeholder="Country" defaultValue="US" required />
          <h2>Fake payment</h2>
          <input className="input" name="cardholderName" placeholder="Cardholder name" defaultValue={customer.name} required />
          <input className="input" name="cardNumber" placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" required />
          <div className="grid two">
            <input className="input" name="expiry" placeholder="12/30" defaultValue="12/30" required />
            <input className="input" name="cvv" placeholder="123" defaultValue="123" required />
          </div>
          <button className="button" type="submit">
            Place demo order
          </button>
        </form>
        <aside className="card">
          <h2>Order summary</h2>
          <div className="stack">
            {summary.items.map((item) => (
              <div className="line-item" key={item.productId}>
                <span>
                  {item.product.name} × {item.quantity}
                </span>
                <strong>{formatCurrency(item.lineTotal)}</strong>
              </div>
            ))}
          </div>
          <dl className="summary-list">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatCurrency(summary.subtotal)}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>{summary.shipping ? formatCurrency(summary.shipping) : "Free"}</dd>
            </div>
            <div>
              <dt>Tax</dt>
              <dd>{formatCurrency(summary.tax)}</dd>
            </div>
            <div className="summary-total">
              <dt>Total</dt>
              <dd>{formatCurrency(summary.total)}</dd>
            </div>
          </dl>
          <p className="muted">
            After checkout, open the assistant and ask “Cancel my latest order” to send a real order-aware AgentGate check.
          </p>
          <Link className="button secondary" href="/cart">
            Back to cart
          </Link>
        </aside>
      </div>
    </main>
  );
}
