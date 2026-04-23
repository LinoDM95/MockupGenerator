import type { ReactNode } from "react";

import { cn } from "../../../lib/ui/cn";
import { WORKSPACE_PANEL_SURFACE } from "../../../lib/ui/workspaceSurfaces";

export type AppDataTableColumn<Row> = {
  id: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

type Props<Row> = {
  columns: AppDataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  emptyLabel?: string;
  className?: string;
  tableClassName?: string;
  /** Dunkle Tabelle für Work-Session-Vollbild (heller Text, Haarlinien). */
  tone?: "default" | "workSession";
};

export const AppDataTable = <Row,>({
  columns,
  rows,
  getRowKey,
  emptyLabel = "Keine Einträge.",
  className,
  tableClassName,
  tone = "default",
}: Props<Row>) => {
  const isWs = tone === "workSession";

  return (
    <div
      className={cn(
        "overflow-x-auto",
        isWs
          ? "rounded-xl border border-[rgb(255_255_255/0.12)] bg-[rgb(15_23_42/0.85)] ring-1 ring-[rgb(255_255_255/0.08)]"
          : WORKSPACE_PANEL_SURFACE,
        className,
      )}
    >
      <table
        className={cn(
          "w-full min-w-[320px] border-collapse text-left text-sm",
          tableClassName,
        )}
      >
        <thead>
          <tr
            className={cn(
              isWs
                ? "border-b border-work-session-hairline bg-work-session-glyph-static"
                : "border-b border-[color:var(--pf-border)] bg-[color:var(--pf-bg-subtle)]",
            )}
          >
            {columns.map((c) => (
              <th
                key={c.id}
                scope="col"
                className={cn(
                  "px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.06em]",
                  isWs
                    ? "text-work-session-caption"
                    : "text-[color:var(--pf-fg-subtle)]",
                  c.headerClassName,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={cn(
                  "px-3 py-8 text-center text-sm font-medium",
                  isWs
                    ? "text-work-session-lead-muted"
                    : "text-[color:var(--pf-fg-muted)]",
                )}
              >
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className={cn(
                  "border-b transition-colors",
                  isWs
                    ? "border-work-session-hairline hover:bg-[rgb(255_255_255/0.04)]"
                    : "border-[color:var(--pf-border-subtle)] hover:bg-[color:var(--pf-bg-muted)]",
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.id}
                    className={cn(
                      "px-3 py-2.5 align-middle text-[13px]",
                      isWs
                        ? "text-work-session-stat"
                        : "text-[color:var(--pf-fg)]",
                      c.cellClassName,
                    )}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
