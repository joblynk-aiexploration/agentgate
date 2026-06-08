import { AdminShell } from "@/components/admin-shell";
import { formatCurrency } from "@/lib/format";
import { readStore } from "@/lib/store";

export default function AdminProductsPage() {
  return (
    <AdminShell>
      <h1>Products</h1>
      <table className="table card">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Inventory</th>
            <th>Reviews</th>
          </tr>
        </thead>
        <tbody>
          {readStore().products.map((product) => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>{product.category}</td>
              <td>{formatCurrency(product.price)}</td>
              <td>{product.inventory}</td>
              <td>
                {product.rating} / {product.reviews}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}
