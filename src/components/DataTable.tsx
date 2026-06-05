import type { ReactNode } from "react";

type Column<T> = {
  key: string;
  header: string;
  render: (row: T, index: number) => ReactNode;
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  emptyMessage = "데이터가 없습니다.",
}: {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center text-[var(--muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--card-border)] bg-black/20 text-left text-[var(--muted)]">
            {columns.map((column) => (
              <th key={column.key} className={`px-4 py-3 font-medium ${column.className ?? ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className="border-b border-[var(--card-border)]/60 last:border-b-0 hover:bg-white/5"
            >
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-3 ${column.className ?? ""}`}>
                  {column.render(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
