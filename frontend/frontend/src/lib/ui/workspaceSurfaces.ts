import { cn } from "./cn";

/**
 * Eingelassene Bedien-Spalte (Generator-Sidebar, Upscaler-Engine):
 * leicht getönt + Inset-Ring, damit sie sich von den weißen Inhaltskarten
 * (Motive, Dropzone, UploadQueueCard) gegen den `bg-slate-50`-Seitengrund abhebt.
 */
export const WORKSPACE_EMBEDDED_BASE =
  "rounded-2xl border border-transparent bg-slate-50/90 shadow-none ring-1 ring-inset ring-slate-900/5";

export const workspaceEmbeddedCardClassName = cn("relative", WORKSPACE_EMBEDDED_BASE);

export const workspaceEmbeddedPanelClassName = cn(
  "overflow-hidden",
  WORKSPACE_EMBEDDED_BASE,
);

/** Leerzustand: Engine-Block mit Innenabstand (ohne `Card`-Wrapper). */
export const workspaceEmbeddedPaddedClassName = cn(WORKSPACE_EMBEDDED_BASE, "p-5");

/** Panel-Karten — Token aus Prototyp (Mockupgenerator.zip styles.css .card). */
export const WORKSPACE_PANEL_SURFACE = cn(
  "rounded-[length:var(--pf-radius-lg)] border border-[color:var(--pf-border)] bg-[color:var(--pf-bg-elevated)] shadow-[var(--pf-shadow-sm)]",
);

export const WORKSPACE_PANEL_HEADER =
  "shrink-0 border-b border-[color:var(--pf-border)] px-3.5 py-3";

export const WORKSPACE_PANEL_TITLE =
  "text-[13px] font-semibold tracking-tight text-[color:var(--pf-fg)]";

/** Sekundäre Flächentypo (Prototyp .muted / .subtle). */
export const WORKSPACE_ZINC_MUTED = "text-[color:var(--pf-fg-muted)]";

export const workspacePanelCardClassName = cn(
  "flex min-h-0 min-w-0 flex-col overflow-hidden",
  WORKSPACE_PANEL_SURFACE,
);
