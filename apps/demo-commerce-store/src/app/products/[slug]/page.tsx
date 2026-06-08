import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DetailRow } from "@/components/ui/detail-row";
import { formatCurrency } from "@/lib/format";
import { readStore } from "@/lib/store";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = readStore();
  const product = store.products.find((item) => item.slug === slug);

  if (!product) {
    notFound();
  }

  const related = store.products
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 3);

  return (
    <main className="section">
      <div className="container grid main-aside">
        <div>
          <div className="product-media" style={{ background: product.image, height: 480 }} />
          <section className="section" style={{ paddingBottom: 0 }}>
            <div className="section-title">
              <h2>Related products</h2>
              <Link className="button secondary" href="/products">All products</Link>
            </div>
            <div className="grid three">
              {(related.length ? related : store.products.filter((item) => item.id !== product.id).slice(0, 3)).map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        </div>
        <aside className="stack">
          <Card>
            <Badge>{product.category}</Badge>
            <h1>{product.name}</h1>
            <p className="muted">{product.description}</p>
            <h2>{formatCurrency(product.price)}</h2>
            <div className="stack">
              <DetailRow label="Rating" value={`${product.rating} / 5 from ${product.reviews} demo reviews`} />
              <DetailRow label="Inventory" value={`${product.inventory} ready to ship`} />
              <DetailRow label="Demo shipping" value="Free over $75" />
              <DetailRow label="Returns" value="30-day simulated return window" />
            </div>
            <form action="/api/cart/add" method="post" className="form" style={{ marginTop: 18 }}>
              <input name="productId" type="hidden" value={product.id} />
              <label>
                Quantity
                <input className="input qty-input" min="1" max={product.inventory} name="quantity" type="number" defaultValue="1" />
              </label>
              <button className="button" type="submit">Add to cart</button>
            </form>
          </Card>
          <Card>
            <h2>Technical details</h2>
            <ul>
              {product.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <p className="muted">Product visuals are professional placeholders. Inventory, cart, checkout, and support actions are local demo data.</p>
            <Button href="/help" variant="secondary">Ask Northstar Assistant</Button>
          </Card>
        </aside>
      </div>
    </main>
  );
}
