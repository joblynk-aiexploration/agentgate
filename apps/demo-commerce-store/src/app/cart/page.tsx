import Link from "next/link";
import { readStore } from "@/lib/store";

export default function CartPage() {
  const products = readStore().products.slice(0, 2);

  return (
    <main className="section">
      <div className="container grid two">
        <section className="card">
          <h1>Demo cart</h1>
          <p className="muted">The cart is prefilled for the local demo. No real payment is collected.</p>
          {products.map((product) => (
            <p key={product.id}>
              <strong>{product.name}</strong> · Qty 1
            </p>
          ))}
        </section>
        <aside className="card">
          <h2>Checkout safely</h2>
          <p className="muted">Checkout creates a local JSON demo order only.</p>
          <Link className="button" href="/checkout">
            Continue to checkout
          </Link>
        </aside>
      </div>
    </main>
  );
}
