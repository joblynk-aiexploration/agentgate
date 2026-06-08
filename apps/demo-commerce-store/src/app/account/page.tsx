import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";
import { listOrdersForCustomer } from "@/lib/store";

export default async function AccountPage() {
  const customer = await getCurrentCustomer();

  if (!customer) {
    redirect("/login?returnTo=/account");
  }

  const orders = listOrdersForCustomer(customer.id);

  return (
    <main className="section">
      <div className="container grid two">
        <section className="card">
          <h1>Account</h1>
          <p>
            <strong>{customer.name}</strong>
            <br />
            <span className="muted">{customer.email}</span>
          </p>
          <div className="button-row">
            <Link className="button" href="/account/orders">
              View orders
            </Link>
            <form action="/api/customer/logout" method="post">
              <button className="button secondary" type="submit">
                Logout
              </button>
            </form>
          </div>
        </section>
        <section className="card">
          <h2>Recent orders</h2>
          {orders.length ? (
            <div className="stack">
              {orders.slice(0, 3).map((order) => (
                <Link className="line-item" href={`/account/orders/${order.number}`} key={order.id}>
                  <span>
                    <strong>{order.number}</strong>
                    <br />
                    <span className="muted">{formatDate(order.createdAt)}</span>
                  </span>
                  <span className="badge">{titleCase(order.status)}</span>
                  <strong>{formatCurrency(order.total)}</strong>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">No orders yet. Checkout first, then ask the assistant about your latest order.</p>
          )}
        </section>
      </div>
    </main>
  );
}
