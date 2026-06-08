import { redirect } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatDate } from "@/lib/format";
import { readStore } from "@/lib/store";
import { receiptsForCustomer } from "@/lib/tracking";
import type { Receipt } from "@/lib/types";

export default async function CustomerReceiptsPage() {
  const customer = await getCurrentCustomer();

  if (!customer) {
    redirect("/login?returnTo=/account/receipts");
  }

  const receipts = receiptsForCustomer(readStore().receipts, customer.email);
  const columns: DataTableColumn<Receipt>[] = [
    { header: "Receipt", cell: (receipt) => <strong>{receipt.id}</strong> },
    { header: "Order", cell: (receipt) => receipt.orderNumber },
    { header: "Email", cell: (receipt) => receipt.email },
    { header: "Created", cell: (receipt) => formatDate(receipt.sentAt) },
    { header: "Mode", cell: (receipt) => receipt.previewOnly ? "Preview only" : "Sent" },
  ];

  return (
    <CustomerShell customer={customer}>
      <div className="page-header">
        <div>
          <p className="eyebrow">Receipts</p>
          <h1>Receipt previews</h1>
          <p className="muted">Receipts are local preview records. No real email is sent in V1.</p>
        </div>
      </div>
      <DataTable columns={columns} rows={receipts} empty={<EmptyState title="No receipts yet" description="Checkout creates a local receipt preview." />} />
    </CustomerShell>
  );
}
