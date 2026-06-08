import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { readStore } from "@/lib/store";

export default function HomePage() {
  const store = readStore();

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="badge">Local AgentGate demo store</div>
            <h1>Trail gear with a support agent AgentGate can control.</h1>
            <p>
              Northstar Outdoor Supply is a fake ecommerce site for testing AI support
              agents against real-looking orders, policies, approvals, and audit trails.
            </p>
            <div className="button-row">
              <Link className="button" href="/products">
                Shop demo products
              </Link>
              <Link className="button secondary" href="/admin/api">
                Configure AgentGate
              </Link>
            </div>
          </div>
          <div className="hero-panel">
            <h2>Customer → Chat agent → AgentGate → simulated store action</h2>
            <p className="muted">
              Try: “Cancel my order NS-1002. My email is sarah@example.com.” The
              backend support agent checks AgentGate before touching local order state.
            </p>
            <ul>
              <li>High-value cancellation requires approval.</li>
              <li>Shipped cancellation is blocked.</li>
              <li>Receipt resend is checked before preview simulation.</li>
            </ul>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="section-title">
            <h2>Featured gear</h2>
            <Link href="/products">View all</Link>
          </div>
          <div className="grid three">
            {store.products.slice(0, 6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
