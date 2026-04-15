import { MessageSquare, PanelRightClose, PanelRightOpen, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "../../lib/cn";
import {
  useAiActivityStore,
  type AiActivityEntry,
  type AiActivityKind,
} from "../../store/aiActivityStore";
import { Button } from "../ui/Button";

const kindLabel = (k: AiActivityKind): string => {
  switch (k) {
    case "standard":
      return "Standard";
    case "expert":
      return "Expert";
    case "grounding":
      return "Suche";
    default:
      return "Info";
  }
};

const kindStyle = (k: AiActivityKind): string => {
  switch (k) {
    case "expert":
      return "border-indigo-500/40 bg-indigo-950/50 text-indigo-100";
    case "grounding":
      return "border-emerald-500/40 bg-emerald-950/40 text-emerald-100";
    case "standard":
      return "border-slate-600/60 bg-slate-900/80 text-slate-100";
    default:
      return "border-slate-700 bg-slate-900/70 text-slate-200";
  }
};

const formatTime = (at: number): string => {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(at));
  } catch {
    return "";
  }
};

const EntryRow = ({ entry }: { entry: AiActivityEntry }) => (
  <li className="border-b border-slate-800/80 py-2.5 last:border-0">
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
          kindStyle(entry.kind),
        )}
      >
        {kindLabel(entry.kind)}
      </span>
      <time className="text-[10px] text-slate-500" dateTime={new Date(entry.at).toISOString()}>
        {formatTime(entry.at)}
      </time>
    </div>
    <p className="mt-1 text-xs font-medium text-slate-100">{entry.title}</p>
    {entry.detail ? (
      <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-400">
        {entry.detail}
      </p>
    ) : null}
  </li>
);

export const AIActivityPanel = () => {
  const entries = useAiActivityStore((s) => s.entries);
  const panelOpen = useAiActivityStore((s) => s.panelOpen);
  const setPanelOpen = useAiActivityStore((s) => s.setPanelOpen);
  const togglePanel = useAiActivityStore((s) => s.togglePanel);
  const clearAiLogs = useAiActivityStore((s) => s.clearAiLogs);

  return (
    <div className="pointer-events-none fixed bottom-0 right-0 z-[300] flex flex-col items-end p-4 sm:p-5">
      <AnimatePresence>
        {panelOpen ? (
          <motion.aside
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="pointer-events-auto mb-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl"
            aria-label="KI-Aktivität"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare className="h-4 w-4 shrink-0 text-indigo-400" aria-hidden />
                <span className="truncate text-sm font-semibold text-slate-100">KI-Aktivität</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => clearAiLogs()}
                  className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
                  aria-label="Protokoll leeren"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
                  aria-label="Panel schließen"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <ul className="max-h-[min(50vh,320px)] overflow-y-auto px-3 py-1">
              {entries.length === 0 ? (
                <li className="py-8 text-center text-xs text-slate-500">
                  Noch keine Einträge. Starte eine KI-Generierung (z. B. Gelato-Export → KI).
                </li>
              ) : (
                entries.map((e) => <EntryRow key={e.id} entry={e} />)
              )}
            </ul>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <Button
        type="button"
        variant="outline"
        className={cn(
          "pointer-events-auto h-11 gap-2 rounded-full border-slate-600 bg-slate-900/95 px-4 text-slate-100 shadow-lg backdrop-blur-sm hover:bg-slate-800",
          entries.length > 0 && "border-indigo-500/50 ring-1 ring-indigo-500/20",
        )}
        onClick={() => togglePanel()}
        aria-expanded={panelOpen}
        aria-label={panelOpen ? "KI-Aktivität ausblenden" : "KI-Aktivität anzeigen"}
      >
        {panelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        <span className="text-sm font-medium">KI</span>
        {entries.length > 0 ? (
          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
            {entries.length > 99 ? "99+" : entries.length}
          </span>
        ) : null}
      </Button>
    </div>
  );
};
