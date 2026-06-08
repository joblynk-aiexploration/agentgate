import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import { readStore } from "@/lib/store";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = readStore().products.find((item) => item.slug === slug);

  if (!product) {
    notFound();
  }

  return (
    <main className="section">
      <div className="container grid two">
        <div className="product-media" style={{ background: product.image, height: 420 }} />
        <section>
          <div className="badge">{product.category}</div>
          <h1>{product.name}</h1>
          <p className="muted">{product.description}</p>
          <h2>{formatCurrency(product.price)}</h2>
          <p>
            {product.rating} stars from {product.reviews} demo reviews · {product.inventory} in stock
          </p>
          <ul>
            {product.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <div className="button-row">
            <form action="/api/cart/add" method="post" className="inline-form">
              <input name="productId" type="hidden" value={product.id} />
              <label>
                Qty
                <input className="input qty-input" min="1" max={product.inventory} name="quantity" type="number" defaultValue="1" />
              </label>
              <button className="button" type="submit">
                Add to cart
              </button>
            </form>
            <Link className="button secondary" href="/help">
              Ask assistant
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
