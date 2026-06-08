import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";
import { listOrdersForCustomer } from "@/lib/store";

export default async function OrdersPage() {
  const customer = await getCurrentCustomer();

  if (!customer) {
    redirect("/login?returnTo=/account/orders");
  }

  const orders = listOrdersForCustomer(customer.id);

  return (
    <main className="section">
      <div className="container">
        <div className="section-title">
          <div>
            <h1>Your orders</h1>
            <p className="muted">Only orders created by your local checkout appear here.</p>
          </div>
          <Link className="button secondary" href="/products">
            Shop more
          </Link>
        </div>
        {orders.length ? (
          <table className="table card">
            <thead>
              <tr>
                <th>Order</th>
                <th>Status</th>
                <th>Items</th>
                <th>Total</th>
                <th />
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
                    <span className="badge">{titleCase(order.status)}</span>
                  </td>
                  <td>{order.items.map((item) => `${item.name} x ${item.quantity}`).join(", ")}</td>
                  <td>{formatCurrency(order.total)}</td>
                  <td>
                    <Link className="button secondary" href={`/account/orders/${order.number}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <section className="card empty">
            <h2>No orders yet</h2>
            <p className="muted">Create a real local checkout order before asking the assistant for order help.</p>
            <Link className="button" href="/products">
              Start shopping
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
