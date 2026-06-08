import Link from "next/link";
import { getRequestCartOwner } from "@/lib/customer-auth";
import { formatCurrency } from "@/lib/format";
import { getCart, hydrateCart } from "@/lib/store";

export default async function CartPage() {
  const { customer, owner } = await getRequestCartOwner();
  const summary = hydrateCart(getCart(owner));

  return (
    <main className="section">
      <div className="container grid two">
        <section className="card">
          <h1>Cart</h1>
          <p className="muted">This cart creates local demo orders only. No payment provider is contacted.</p>
          {summary.items.length ? (
            <div className="stack">
              {summary.items.map((item) => (
                <div className="line-item" key={item.productId}>
                  <div>
                    <strong>{item.product.name}</strong>
                    <p className="muted">
                      {formatCurrency(item.product.price)} · {item.product.inventory} in stock
                    </p>
                  </div>
                  <form action="/api/cart/update" method="post" className="inline-form">
                    <input name="productId" type="hidden" value={item.productId} />
                    <input className="input qty-input" min="0" max={item.product.inventory} name="quantity" type="number" defaultValue={item.quantity} />
                    <button className="button secondary" type="submit">
                      Update
                    </button>
                  </form>
                  <form action="/api/cart/remove" method="post">
                    <input name="productId" type="hidden" value={item.productId} />
                    <button className="button secondary" type="submit">
                      Remove
                    </button>
                  </form>
                  <strong>{formatCurrency(item.lineTotal)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>Your cart is empty</h2>
              <p className="muted">Add real demo products before checkout so the agent can later inspect an actual order.</p>
              <Link className="button" href="/products">
                Shop products
              </Link>
            </div>
          )}
        </section>
        <aside className="card">
          <h2>Order summary</h2>
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
              <dt>Estimated tax</dt>
              <dd>{formatCurrency(summary.tax)}</dd>
            </div>
            <div className="summary-total">
              <dt>Total</dt>
              <dd>{formatCurrency(summary.total)}</dd>
            </div>
          </dl>
          {summary.items.length ? (
            <Link className="button" href={customer ? "/checkout" : "/login?returnTo=/checkout"}>
              Continue to checkout
            </Link>
          ) : (
            <Link className="button secondary" href="/products">
              Add products first
            </Link>
          )}
        </aside>
      </div>
    </main>
  );
}
