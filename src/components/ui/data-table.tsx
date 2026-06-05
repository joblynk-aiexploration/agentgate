import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/empty-state";

export type DataTableColumn<T> = {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  className?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  emptyTitle?: string;
  emptyDescription?: string;
  rowKey: (row: T, index: number) => string;
};

export function DataTable<T>({
  columns,
  data,
  emptyTitle = "No records",
  emptyDescription = "There is no data to display yet.",
  rowKey,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  return (
    <div className="overflow-x-auto border-t border-[#edf1f6]">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[#e5e9ef] bg-[#f8fafc] text-xs uppercase text-[#687384]">
            {columns.map((column) => (
              <th className={cn("px-4 py-3 font-semibold", column.className)} key={column.header}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              className="border-b border-[#edf1f6] transition hover:bg-[#fbfcfe] last:border-0"
              key={rowKey(row, index)}
            >
              {columns.map((column) => {
                const value =
                  typeof column.accessor === "function"
                    ? column.accessor(row)
                    : (row[column.accessor] as ReactNode);

                return (
                  <td className={cn("px-4 py-3 align-top", column.className)} key={column.header}>
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
