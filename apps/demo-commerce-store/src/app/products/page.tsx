import { ProductCard } from "@/components/product-card";
import { readStore } from "@/lib/store";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const store = readStore();
  const { category } = await searchParams;
  const categories = Array.from(new Set(store.products.map((product) => product.category)));
  const products = category
    ? store.products.filter((product) => product.category === category)
    : store.products;

  return (
    <main className="section">
      <div className="container">
        <div className="section-title">
          <div>
            <h1>Products</h1>
            <p className="muted">Realistic demo inventory. No payment is collected.</p>
          </div>
        </div>
        <div className="button-row" style={{ marginBottom: 24 }}>
          <a className="badge" href="/products">
            All
          </a>
          {categories.map((item) => (
            <a className="badge" href={`/products?category=${encodeURIComponent(item)}`} key={item}>
              {item}
            </a>
          ))}
        </div>
        <div className="grid three">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </main>
  );
}
