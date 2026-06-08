import { AdminShell } from "@/components/admin-shell";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";
import { readStore } from "@/lib/store";

export default function AdminOrdersPage() {
  const orders = readStore().orders;

  return (
    <AdminShell>
      <h1>Orders</h1>
      <table className="table card">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Total</th>
            <th>Items</th>
            <th>Agent actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <strong>{order.number}</strong>
                <br />
                <span className="muted">{formatDate(order.createdAt)}</span>
              </td>
              <td>
                {order.customerName}
                <br />
                <span className="muted">{order.email}</span>
              </td>
              <td>
                <span className="badge">{titleCase(order.status)}</span>
              </td>
              <td>{formatCurrency(order.total)}</td>
              <td>{order.items.map((item) => item.name).join(", ")}</td>
              <td>{order.agentActions.length ? order.agentActions.join("; ") : "None yet"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}
