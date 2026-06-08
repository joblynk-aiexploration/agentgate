import Link from "next/link";
import { getRequestCartOwner } from "@/lib/customer-auth";
import { formatCurrency } from "@/lib/format";
import { getCart, hydrateCart } from "@/lib/store";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default async function CartPage() {
  const { customer, owner } = await getRequestCartOwner();
  const summary = hydrateCart(getCart(owner));

  return (
    <main className="section">
      <div className="container grid main-aside">
        <section className="card">
          <PageHeader eyebrow="Cart" title="Review your gear" description="Local checkout creates demo orders only. No payment provider is contacted." />
          {summary.items.length ? (
            <div className="stack">
              {summary.items.map((item) => (
                <div className="line-item" key={item.productId}>
                  <div>
                    <strong>{item.product.name}</strong>
                    <p className="muted">
                      {formatCurrency(item.product.price)} each · {item.product.inventory} in stock
                    </p>
                  </div>
                  <form action="/api/cart/update" method="post" className="inline-form">
                    <input name="productId" type="hidden" value={item.productId} />
                    <input className="input qty-input" min="0" max={item.product.inventory} name="quantity" type="number" defaultValue={item.quantity} aria-label={`Quantity for ${item.product.name}`} />
                    <button className="button secondary" type="submit">Update</button>
                  </form>
                  <form action="/api/cart/remove" method="post">
                    <input name="productId" type="hidden" value={item.productId} />
                    <button className="button secondary" type="submit">Remove</button>
                  </form>
                  <strong>{formatCurrency(item.lineTotal)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Your cart is empty" description="Add demo products before checkout so the support agent can later inspect an actual order." actionHref="/products" actionLabel="Shop products" />
          )}
        </section>
        <aside className="card">
          <h2>Order summary</h2>
          <dl className="summary-list">
            <div><dt>Subtotal</dt><dd>{formatCurrency(summary.subtotal)}</dd></div>
            <div><dt>Shipping</dt><dd>{summary.shipping ? formatCurrency(summary.shipping) : "Free"}</dd></div>
            <div><dt>Estimated tax</dt><dd>{formatCurrency(summary.tax)}</dd></div>
            <div className="summary-total"><dt>Total</dt><dd>{formatCurrency(summary.total)}</dd></div>
          </dl>
          <p className="muted">Demo checkout only. You can use fake card `4242 4242 4242 4242`.</p>
          {summary.items.length ? (
            <Link className="button" href={customer ? "/checkout" : "/login?returnTo=/checkout"}>Continue to checkout</Link>
          ) : (
            <Link className="button secondary" href="/products">Add products first</Link>
          )}
        </aside>
      </div>
    </main>
  );
}
