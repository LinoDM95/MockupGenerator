import { Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export type ExpertDebatePhaseKey = "scout" | "critic" | "editor";

export type ExpertDebatePhase = {
  key: ExpertDebatePhaseKey;
  label: string;
  status: "pending" | "running" | "done";
  thought?: string;
};

const RUNNING_HINT: Record<ExpertDebatePhaseKey, string> = {
  scout: "Trend-Scout: Bild & Trends werden analysiert …",
  critic: "Kritiker: Entwurf, Floskeln und Markenrisiken prüfen …",
  editor: "Editor: finale SEO (Titel, 13 Tags, Beschreibung) …",
};

type Props = {
  phases: ExpertDebatePhase[];
  fallbackBanner?: string | null;
  currentStepLabel?: string;
};

export const ExpertDebateConsole = ({
  phases,
  fallbackBanner,
  currentStepLabel,
}: Props) => {
  return (
    <div
      className="mt-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-slate-200 shadow-inner"
      aria-live="polite"
    >
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-800 pb-2 text-[10px] uppercase tracking-wider text-slate-500">
        <span>War Room</span>
        {currentStepLabel ? (
          <span className="normal-case text-indigo-300">{currentStepLabel}</span>
        ) : null}
      </div>
      {fallbackBanner ? (
        <div
          role="status"
          className="mb-2 rounded border border-amber-700/60 bg-amber-950/80 px-2 py-1.5 text-amber-100"
        >
          {fallbackBanner}
        </div>
      ) : null}
      <ul className="space-y-3">
        {phases.map((phase) => (
          <li key={phase.key} className="border-l-2 border-slate-700 pl-2.5">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-slate-500">
                {phase.status === "pending" && "○"}
                {phase.status === "running" && (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-indigo-400" aria-hidden />
                )}
                {phase.status === "done" && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
                )}
              </span>
              <span
                className={
                  phase.status === "running"
                    ? "font-medium text-indigo-200"
                    : phase.status === "done"
                      ? "text-slate-200"
                      : "text-slate-500"
                }
              >
                {phase.label}
              </span>
            </div>
            <AnimatePresence mode="wait">
              {(phase.status === "running" || phase.status === "done") && (
                <motion.div
                  key={phase.thought ?? phase.status}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-1.5 whitespace-pre-wrap text-slate-400"
                >
                  {phase.status === "running" && !phase.thought
                    ? RUNNING_HINT[phase.key]
                    : phase.thought ?? ""}
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        ))}
      </ul>
    </div>
  );
};
