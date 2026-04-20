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
