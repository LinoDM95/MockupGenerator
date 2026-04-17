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
      className="mt-4 overflow-hidden rounded-xl bg-slate-900 font-mono text-xs leading-relaxed text-slate-300 shadow-inner ring-1 ring-inset ring-slate-900/50"
      aria-live="polite"
    >
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/50 px-4 py-2.5">
        <span className="font-semibold tracking-wide text-slate-400">Multi-Agent Engine</span>
        {currentStepLabel ? (
          <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
            {currentStepLabel}
          </span>
        ) : null}
      </div>

      {fallbackBanner ? (
        <div className="border-b border-amber-900/30 bg-amber-500/10 px-4 py-2 text-amber-200/90">
          {fallbackBanner}
        </div>
      ) : null}

      <div className="space-y-3 p-4">
        {phases.map((phase) => (
          <div
            key={phase.key}
            className={phase.status === "pending" ? "opacity-40" : "opacity-100"}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                {phase.status === "pending" && (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                )}
                {phase.status === "running" && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" aria-hidden />
                )}
                {phase.status === "done" && (
                  <Check className="h-4 w-4 text-emerald-400" aria-hidden />
                )}
              </span>
              <span
                className={
                  phase.status === "running" ? "font-semibold text-white" : "font-medium"
                }
              >
                {phase.label}
              </span>
            </div>

            <AnimatePresence mode="wait">
              {(phase.status === "running" || phase.status === "done") && (
                <motion.div
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-6 mt-1.5 border-l-2 border-slate-700/50 pl-3 text-[11px] text-slate-400"
                >
                  {phase.status === "running" && !phase.thought
                    ? RUNNING_HINT[phase.key]
                    : (phase.thought ?? "")}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};
