import { AlertCircle, Loader2, Trash2 } from "lucide-react";

import type { UpscaleTotalFactor } from "../../api/upscaler";
import { computeNeedsTiling } from "../../lib/upscaler/computeNeedsTiling";
import { cn } from "../../lib/ui/cn";
import type { AppDataTableColumn } from "../ui/layout/AppDataTable";
import { AppDataTable } from "../ui/layout/AppDataTable";
import { Button } from "../ui/primitives/Button";

export type UpscalerQueueItemStatus =
  | "pending"
  | "running"
  | "done"
  | "error"
  | "cancelled";

export type UpscalerQueueTableRow = {
  id: string;
  file: File;
  previewUrl: string;
  status: UpscalerQueueItemStatus;
  originalWidth?: number;
  originalHeight?: number;
  upscaledWidth?: number;
  upscaledHeight?: number;
  errorMessage?: string;
};

type TableTone = "default" | "workSession";

type Props = {
  items: UpscalerQueueTableRow[];
  factor: UpscaleTotalFactor;
  isProcessing: boolean;
  onRemove: (id: string) => void;
  /** Gleiche Tabelle im Work-Session-Vollbild (dunkles Panel). */
  variant?: "default" | "workSession";
  /** Wird in der ETA-Spalte für die Zeile mit Status „running“ angezeigt (Sitzungs-ETA). */
  sessionEtaLabel?: string | null;
  showActions?: boolean;
};

const StatusCell = ({
  row,
  tone,
}: {
  row: UpscalerQueueTableRow;
  tone: TableTone;
}) => {
  const ws = tone === "workSession";
  if (row.status === "pending") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ring-1 ring-inset",
          ws
            ? "bg-[rgb(255_255_255/0.06)] text-work-session-lead-muted ring-[rgb(255_255_255/0.1)]"
            : "bg-[color:var(--pf-bg-muted)] text-[color:var(--pf-fg-muted)] ring-[color:var(--pf-border-subtle)]",
        )}
      >
        Warteschlange
      </span>
    );
  }
  if (row.status === "running") {
    return (
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Loader2
            className={cn(
              "h-4 w-4 shrink-0 animate-spin",
              ws ? "text-violet-300" : "text-[color:var(--pf-accent)]",
            )}
            aria-hidden
          />
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest",
              ws ? "text-violet-200" : "text-[color:var(--pf-accent)]",
            )}
          >
            Läuft
          </span>
        </div>
        <div
          className={cn(
            "h-1.5 w-full max-w-[7.5rem] overflow-hidden rounded-full",
            ws ? "bg-work-session-progress-track" : "bg-[color:var(--pf-bg-muted)]",
          )}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext="Fortschritt wird geschätzt"
        >
          <div
            className={cn(
              "h-full w-2/3 animate-pulse rounded-full",
              ws ? "bg-violet-400/90" : "bg-[color:var(--pf-accent)]",
            )}
          />
        </div>
      </div>
    );
  }
  if (row.status === "done") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ring-1 ring-inset",
          ws
            ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25"
            : "bg-[color:var(--pf-success-bg)] text-[color:var(--pf-success)] ring-[color:var(--pf-success)]/25",
        )}
      >
        Fertig
      </span>
    );
  }
  if (row.status === "error") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest",
          ws ? "text-red-300" : "text-[color:var(--pf-danger)]",
        )}
      >
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
        Fehler
      </span>
    );
  }
  return (
    <span
      className={cn(
        "text-[10px] font-bold uppercase tracking-widest",
        ws ? "text-work-session-caption" : "text-[color:var(--pf-fg-muted)]",
      )}
    >
      Abgebrochen
    </span>
  );
};

export const UpscalerQueueTable = ({
  items,
  factor,
  isProcessing,
  onRemove,
  variant = "default",
  sessionEtaLabel = null,
  showActions = true,
}: Props) => {
  const tone: TableTone = variant === "workSession" ? "workSession" : "default";
  const ws = tone === "workSession";

  const motivTitle = ws ? "text-work-session-title" : "text-[color:var(--pf-fg)]";
  const motivMeta = ws ? "text-work-session-lead-muted" : "text-[color:var(--pf-fg-muted)]";
  const mono = ws ? "text-work-session-lead-muted" : "text-[color:var(--pf-fg-muted)]";
  const thumbBox = ws
    ? "border-[rgb(255_255_255/0.15)] bg-[rgb(15_23_42/0.6)]"
    : "border-[color:var(--pf-border)] bg-[color:var(--pf-bg-muted)]";
  const badge = ws
    ? "bg-[rgb(255_255_255/0.08)] text-work-session-lead-muted ring-[rgb(255_255_255/0.12)]"
    : "bg-[color:var(--pf-bg-muted)] text-[color:var(--pf-fg-muted)] ring-[color:var(--pf-border-subtle)]";
  const warn = ws ? "text-amber-200/90" : "text-[color:var(--pf-warning)]";
  const err = ws ? "text-red-300" : "text-[color:var(--pf-danger)]";
  const cancel = ws ? "text-work-session-subtitle" : "text-[color:var(--pf-fg-muted)]";

  const columns: AppDataTableColumn<UpscalerQueueTableRow>[] = [
    {
      id: "thumb",
      header: "",
      headerClassName: "w-14",
      cellClassName: "w-14",
      cell: (row) => (
        <div className={cn("h-11 w-11 overflow-hidden rounded-md border", thumbBox)}>
          <img src={row.previewUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ),
    },
    {
      id: "motiv",
      header: "Motiv",
      cell: (row) => {
        const needsTiling = computeNeedsTiling(row, factor);
        return (
          <div className="min-w-0 max-w-[14rem]">
            <p className={cn("truncate text-sm font-semibold", motivTitle)}>{row.file.name}</p>
            <p className={cn("mt-0.5 text-xs font-medium", motivMeta)}>
              {(row.file.size / (1024 * 1024)).toFixed(2)} MB
              {row.status === "done" && row.upscaledWidth && row.upscaledHeight
                ? ` → ${row.upscaledWidth}×${row.upscaledHeight}`
                : null}
            </p>
            {needsTiling ? (
              <p className={cn("mt-1 text-xs font-medium", warn)}>
                Kachelverarbeitung (über 17 MP)
              </p>
            ) : null}
            {row.status === "error" && row.errorMessage ? (
              <p className={cn("mt-1 text-xs font-medium", err)}>{row.errorMessage}</p>
            ) : null}
            {row.status === "cancelled" && row.errorMessage ? (
              <p className={cn("mt-1 text-xs font-medium", cancel)}>{row.errorMessage}</p>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "von",
      header: "Von",
      headerClassName: "w-[6.5rem]",
      cellClassName: "w-[6.5rem]",
      cell: (row) => (
        <span className={cn("font-mono text-xs font-medium tabular-nums", mono)}>
          {row.originalWidth && row.originalHeight
            ? `${row.originalWidth}×${row.originalHeight}`
            : "—"}
        </span>
      ),
    },
    {
      id: "nach",
      header: "Nach",
      headerClassName: "w-[7.5rem]",
      cellClassName: "w-[7.5rem]",
      cell: (row) => {
        const ow = row.originalWidth;
        const oh = row.originalHeight;
        if (!ow || !oh) {
          return <span className={cn("text-xs font-medium", motivMeta)}>—</span>;
        }
        const tw = Math.round(ow * factor);
        const th = Math.round(oh * factor);
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("font-mono text-xs font-medium tabular-nums", mono)}>
              {tw}×{th}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset",
                badge,
              )}
            >
              {factor}×
            </span>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cellClassName: "min-w-[8.5rem]",
      cell: (row) => <StatusCell row={row} tone={tone} />,
    },
    {
      id: "eta",
      header: (
        <abbr
          title="Geschätzte Restzeit (ETA — estimated time of arrival)"
          className="cursor-help no-underline"
        >
          ETA
        </abbr>
      ),
      headerClassName: "min-w-[5.5rem]",
      cellClassName: "min-w-[5.5rem] max-w-[10rem]",
      cell: (row) => {
        if (row.status === "running" && sessionEtaLabel?.trim()) {
          return (
            <span
              className={cn(
                "line-clamp-2 text-xs font-medium leading-snug",
                ws ? "text-work-session-lead" : "text-[color:var(--pf-fg)]",
              )}
              title={sessionEtaLabel}
            >
              {sessionEtaLabel}
            </span>
          );
        }
        return (
          <span
            className={cn(
              "text-xs font-medium",
              ws ? "text-work-session-caption" : "text-[color:var(--pf-fg-faint)]",
            )}
          >
            —
          </span>
        );
      },
    },
  ];

  if (showActions) {
    columns.push({
      id: "actions",
      header: "",
      headerClassName: "w-12",
      cellClassName: "w-12 text-right",
      cell: (row) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 w-9 shrink-0 p-0",
            ws
              ? "text-work-session-caption hover:text-red-300"
              : "text-[color:var(--pf-fg-muted)] hover:text-[color:var(--pf-danger)]",
          )}
          disabled={isProcessing}
          onClick={() => onRemove(row.id)}
          aria-label={`${row.file.name} entfernen`}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      ),
    });
  }

  return (
    <AppDataTable
      tone={tone}
      columns={columns}
      rows={items}
      getRowKey={(row) => row.id}
      emptyLabel="Noch keine Jobs — rechts Motive unter „Neuer Upscale-Job“ hinzufügen."
      className={cn(items.length === 0 && !ws && "border-dashed")}
    />
  );
};
