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
  if (k === "standard") return "Standard";
  if (k === "expert") return "Expert";
  if (k === "grounding") return "Suche";
  return "Info";
};

const kindStyle = (k: AiActivityKind): string => {
  if (k === "expert") return "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-500/20";
  if (k === "grounding")
    return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20";
  if (k === "standard") return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-900/5";
  return "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-900/5";
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
  <li className="group flex flex-col gap-1.5 border-b border-slate-100 py-3 last:border-0">
    <div className="flex items-center justify-between gap-2">
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
          kindStyle(entry.kind),
        )}
      >
        {kindLabel(entry.kind)}
      </span>
      <time
        className="text-[10px] font-medium text-slate-400"
        dateTime={new Date(entry.at).toISOString()}
      >
        {formatTime(entry.at)}
      </time>
    </div>
    <div className="text-xs font-medium leading-relaxed text-slate-700">
      <span className="font-semibold text-slate-900">{entry.title}</span>
    </div>
    {entry.detail ? (
      <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-500">
        {entry.detail}
      </p>
    ) : null}
  </li>
);

export const AIActivityPanel = () => {
  const entries = useAiActivityStore((s) => s.entries);
  const clearAiLogs = useAiActivityStore((s) => s.clearAiLogs);
  const panelOpen = useAiActivityStore((s) => s.panelOpen);
  const togglePanel = useAiActivityStore((s) => s.togglePanel);

  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-[100] flex flex-col items-start gap-3">
      <AnimatePresence>
        {panelOpen ? (
          <motion.aside
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex w-[22rem] flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-slate-900/5"
            aria-label="KI-Aktivität"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <MessageSquare size={16} className="text-indigo-600" aria-hidden />
                KI-Aktivität
              </h3>
              <div className="flex items-center gap-1">
                {entries.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => clearAiLogs()}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-red-600"
                    title="Verlauf leeren"
                    aria-label="Verlauf leeren"
                  >
                    <Trash2 size={14} strokeWidth={2} aria-hidden />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => togglePanel()}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-900"
                  aria-label="Panel schließen"
                >
                  <X size={16} strokeWidth={2} aria-hidden />
                </button>
              </div>
            </div>
            <ul className="max-h-[320px] overflow-y-auto px-5 py-2">
              {entries.length === 0 ? (
                <li className="py-10 text-center text-xs font-medium text-slate-400">
                  Noch keine Einträge. Starte eine KI-Generierung.
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
          "pointer-events-auto h-12 rounded-full border-slate-200 bg-white px-5 text-slate-700 shadow-md transition-all hover:border-slate-300 hover:bg-slate-50",
          entries.length > 0 && "ring-2 ring-indigo-500/20",
        )}
        onClick={() => togglePanel()}
        aria-expanded={panelOpen}
        aria-label={panelOpen ? "KI-Logbuch ausblenden" : "KI-Logbuch anzeigen"}
      >
        {panelOpen ? <PanelRightClose size={18} aria-hidden /> : <PanelRightOpen size={18} aria-hidden />}
        KI Logbuch
        {entries.length > 0 ? (
          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
            {entries.length > 99 ? "99+" : entries.length}
          </span>
        ) : null}
      </Button>
    </div>
  );
};
