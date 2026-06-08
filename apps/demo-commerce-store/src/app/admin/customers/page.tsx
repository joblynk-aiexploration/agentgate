import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { formatCurrency, formatDate } from "@/lib/format";
import { readStore } from "@/lib/store";
import type { StoreUser } from "@/lib/types";

export default function AdminCustomersPage() {
  const store = readStore();
  const customers = store.users.filter((user) => user.role === "customer");
  const columns: DataTableColumn<StoreUser>[] = [
    { header: "Customer", cell: (user) => <><strong>{user.name}</strong><br /><span className="muted">{user.email}</span></> },
    { header: "Created", cell: (user) => formatDate(user.createdAt) },
    { header: "Orders", cell: (user) => store.orders.filter((order) => order.customerId === user.id).length },
    { header: "Total value", cell: (user) => formatCurrency(store.orders.filter((order) => order.customerId === user.id).reduce((sum, order) => sum + order.total, 0)) },
    { header: "Profile", cell: (user) => <Link className="button secondary" href={`/admin/customers?email=${encodeURIComponent(user.email)}`}>View</Link> },
  ];

  return (
    <AdminShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">Customers</p>
          <h1>Customer profiles</h1>
          <p className="muted">Local customer accounts, order counts, and demo spend. No sensitive payment data is stored.</p>
        </div>
      </div>
      <DataTable columns={columns} rows={customers} />
    </AdminShell>
  );
}
