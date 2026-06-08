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
    <div className="overflow-x-auto rounded-b-lg border-t border-slate-100">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            {columns.map((column, index) => (
              <th
                className={cn("px-4 py-3.5 font-semibold", column.className)}
                key={`${column.header}-${index}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              className="border-b border-slate-100 text-slate-700 transition hover:bg-slate-50/80 last:border-0"
              key={rowKey(row, index)}
            >
              {columns.map((column, columnIndex) => {
                const value =
                  typeof column.accessor === "function"
                    ? column.accessor(row)
                    : (row[column.accessor] as ReactNode);

                return (
                  <td
                    className={cn("px-4 py-3.5 align-top", column.className)}
                    key={`${column.header}-${columnIndex}`}
                  >
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
