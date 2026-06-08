import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  header: string;
  cell: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  empty,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  empty?: ReactNode;
}) {
  if (!rows.length) {
    return empty ? <>{empty}</> : null;
  }

  return (
    <div className="table-wrap card">
      <table className="table">
        <thead>
          <tr>{columns.map((column) => <th key={column.header}>{column.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => <td key={column.header}>{column.cell(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
