import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { readStore } from "@/lib/store";

const categories = [
  "Packs",
  "Outerwear",
  "Footwear",
  "Camp gear",
  "Hydration",
  "Travel essentials",
];

export default function HomePage() {
  const store = readStore();

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <Badge tone="info">AgentGate-monitored local ecommerce demo</Badge>
            <h1>Professional outdoor gear support, safely governed by AgentGate.</h1>
            <p>
              Northstar Outdoor Supply is a realistic local ecommerce storefront
              for testing AI support actions against checkout-created orders,
              approval policies, risk scoring, and audit trails.
            </p>
            <div className="button-row">
              <Button href="/products">Shop products</Button>
              <Button href="/order-lookup" variant="secondary">Track an order</Button>
              <Button href="/login" variant="secondary">Login to demo</Button>
            </div>
          </div>
          <div className="hero-panel">
            <div className="hero-product" />
            <h2>Support agent actions stay behind the gateway.</h2>
            <p className="muted">
              Ask the assistant to cancel a high-value checkout order. Northstar
              sends the action to AgentGate first, then waits for reviewer approval
              before any local order state changes.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid four">
          <MetricCard label="Demo shipping" value="Free over $75" detail="Local checkout only" />
          <MetricCard label="Returns" value="30 days" detail="Simulated policy" />
          <MetricCard label="Checkout" value="Secure demo" detail="No real payment" />
          <MetricCard label="Support" value="AgentGate" detail="Approvals and audit logs" />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="page-header" style={{ alignItems: "center" }}>
            <div>
              <p className="eyebrow">Featured categories</p>
              <h2>Built for trail teams, weekend travel, and serious support demos.</h2>
            </div>
            <Button href="/products" variant="secondary">Browse catalog</Button>
          </div>
          <div className="grid three">
            {categories.map((category) => (
              <Link className="card" href={`/products?search=${encodeURIComponent(category.split(" ")[0])}`} key={category}>
                <Badge>{category}</Badge>
                <h3>{category}</h3>
                <p className="muted">Curated demo inventory with ratings, stock posture, and support-agent context.</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-title">
            <div>
              <p className="eyebrow">Featured gear</p>
              <h2>Premium-looking local demo inventory</h2>
            </div>
            <Link className="button secondary" href="/products">View all</Link>
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
