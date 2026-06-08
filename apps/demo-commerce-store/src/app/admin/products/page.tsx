import { AdminShell } from "@/components/admin-shell";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { readStore } from "@/lib/store";
import type { Product } from "@/lib/types";

export default function AdminProductsPage() {
  const columns: DataTableColumn<Product>[] = [
    { header: "Product", cell: (product) => <><strong>{product.name}</strong><br /><span className="muted">{product.slug}</span></> },
    { header: "Category", cell: (product) => product.category },
    { header: "Price", cell: (product) => formatCurrency(product.price) },
    { header: "Inventory", cell: (product) => <StatusBadge status={product.inventory > 10 ? "active" : "low stock"} /> },
    { header: "Rating", cell: (product) => `${product.rating} / ${product.reviews} reviews` },
  ];

  return (
    <AdminShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">Products</p>
          <h1>Catalog management</h1>
          <p className="muted">Inventory and product metadata for the local demo catalog. Full CMS editing is intentionally lightweight.</p>
        </div>
      </div>
      <DataTable columns={columns} rows={readStore().products} />
    </AdminShell>
  );
}
