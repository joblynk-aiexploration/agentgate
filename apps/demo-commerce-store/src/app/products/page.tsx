import { ProductCard } from "@/components/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { readStore } from "@/lib/store";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string; sort?: string }>;
}) {
  const store = readStore();
  const { category, search = "", sort = "name" } = await searchParams;
  const categories = Array.from(new Set(store.products.map((product) => product.category)));
  const searchText = search.trim().toLowerCase();
  const products = store.products
    .filter((product) => !category || product.category === category)
    .filter((product) =>
      searchText
        ? [product.name, product.category, product.description, ...product.features]
            .join(" ")
            .toLowerCase()
            .includes(searchText)
        : true,
    )
    .sort((left, right) => {
      if (sort === "price-asc") return left.price - right.price;
      if (sort === "price-desc") return right.price - left.price;
      return left.name.localeCompare(right.name);
    });

  return (
    <main className="section">
      <div className="container">
        <PageHeader
          eyebrow="Catalog"
          title="Outdoor equipment"
          description="Search and filter local demo inventory. Checkout creates local orders only; no real payment is processed."
        />
        <form className="card form" method="get" style={{ marginBottom: 22 }}>
          <div className="grid three">
            <label>
              Search
              <Input name="search" placeholder="Backpack, jacket, hydration..." defaultValue={search} />
            </label>
            <label>
              Category
              <Select name="category" defaultValue={category ?? ""}>
                <option value="">All categories</option>
                {categories.map((item) => (
                  <option value={item} key={item}>{item}</option>
                ))}
              </Select>
            </label>
            <label>
              Sort
              <Select name="sort" defaultValue={sort}>
                <option value="name">Name</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </Select>
            </label>
          </div>
          <button className="button" type="submit">Apply filters</button>
        </form>
        <FilterBar>
          <a href="/products">All</a>
          {categories.map((item) => (
            <a href={`/products?category=${encodeURIComponent(item)}`} key={item}>{item}</a>
          ))}
        </FilterBar>
        {products.length ? (
          <div className="grid three">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState title="No products match" description="Try another category, search term, or sort option." actionHref="/products" actionLabel="Reset filters" />
        )}
      </div>
    </main>
  );
}
