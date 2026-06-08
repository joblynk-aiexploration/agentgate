import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatCurrency, formatDate } from "@/lib/format";
import { listOrdersForCustomer } from "@/lib/store";
import { itemCount } from "@/lib/tracking";
import type { Order } from "@/lib/types";

export default async function OrdersPage() {
  const customer = await getCurrentCustomer();

  if (!customer) {
    redirect("/login?returnTo=/account/orders");
  }

  const orders = listOrdersForCustomer(customer.id);
  const columns: DataTableColumn<Order>[] = [
    { header: "Order", cell: (order) => <><strong>{order.number}</strong><br /><span className="muted">{formatDate(order.createdAt)}</span></> },
    { header: "Status", cell: (order) => <StatusBadge status={order.status} /> },
    { header: "Items", cell: (order) => `${itemCount(order)} item(s)` },
    { header: "Total", cell: (order) => formatCurrency(order.total) },
    { header: "Support state", cell: (order) => order.pendingApprovalRequestId ? <span className="badge badge-warning">Approval pending</span> : "No pending action" },
    { header: "Action", cell: (order) => <Link className="button secondary" href={`/account/orders/${order.number}`}>View</Link> },
  ];

  return (
    <CustomerShell customer={customer}>
      <div className="page-header">
        <div>
          <p className="eyebrow">Orders</p>
          <h1>Your order history</h1>
          <p className="muted">Only local checkout orders owned by your customer account appear here.</p>
        </div>
        <Link className="button secondary" href="/products">Shop more</Link>
      </div>
      <DataTable
        columns={columns}
        rows={orders}
        empty={<EmptyState title="No orders yet" description="Create a local checkout order before asking the assistant for order help." actionHref="/products" actionLabel="Start shopping" />}
      />
    </CustomerShell>
  );
}
