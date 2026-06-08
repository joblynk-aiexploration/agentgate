import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="card">
      <div className="product-media" style={{ background: product.image }} />
      <div className="badge">{product.category}</div>
      <h3>{product.name}</h3>
      <p className="muted">{product.description}</p>
      <p>
        <strong>{formatCurrency(product.price)}</strong> · {product.inventory} in stock
      </p>
      <Link className="button secondary" href={`/products/${product.slug}`}>
        View product
      </Link>
    </article>
  );
}
