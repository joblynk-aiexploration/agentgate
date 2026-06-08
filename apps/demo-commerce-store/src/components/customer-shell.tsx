import Link from "next/link";
import type { ReactNode } from "react";

type ShellCustomer = {
  email: string;
  name: string;
};

export function CustomerShell({
  children,
  customer,
}: {
  children: ReactNode;
  customer: ShellCustomer;
}) {
  return (
    <main className="section">
      <div className="container customer-shell">
        <aside className="customer-sidebar">
          <div>
            <strong>{customer.name}</strong>
            <p className="muted" style={{ margin: "4px 0 10px" }}>{customer.email}</p>
          </div>
          <Link href="/account">Dashboard</Link>
          <Link href="/account/orders">Orders</Link>
          <Link href="/account/tracking">Tracking</Link>
          <Link href="/account/receipts">Receipts</Link>
          <Link href="/account/support">Support</Link>
          <form action="/api/customer/logout" method="post">
            <button className="button secondary" type="submit">Logout</button>
          </form>
        </aside>
        <div>{children}</div>
      </div>
    </main>
  );
}
