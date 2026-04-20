import { motion } from "framer-motion";

import { cn } from "../../../lib/ui/cn";
import { Button } from "../primitives/Button";
import { PixelGlyph } from "./PixelGlyph";

export type WorkSessionFooterProps = {
  title: string;
  subtitle?: string;
  message?: string;
  current?: number;
  total?: number;
  packPercent?: number | null;
  indeterminate?: boolean;
  etaLabel?: string | null;
  onAbort?: () => void;
  abortLabel?: string;
  abortDisabled?: boolean;
  showGlyph?: boolean;
};

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Sticky „Dynamic Island“-Panel: Fortschritt, Liquid-Balken, Pixel-Glyph, Abbruch.
 */
export const WorkSessionFooter = ({
  title,
  subtitle = "Bitte kurz warten und dieses Fenster nicht schließen.",
  message = "",
  current = 0,
  total = 1,
  packPercent = null,
  indeterminate = false,
  etaLabel,
  onAbort,
  abortLabel = "Vorgang abbrechen",
  abortDisabled = false,
  showGlyph = true,
}: WorkSessionFooterProps) => {
  const renderPct =
    total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const barPct =
    packPercent !== null && packPercent !== undefined ? packPercent : renderPct;
  const displayPct = indeterminate ? null : Math.min(100, Math.max(0, barPct));

  return (
    <motion.footer
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease }}
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="relative z-20 shrink-0 px-4 pb-6 pt-4 sm:px-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-5 rounded-[2rem] border border-work-session-footer-shell bg-work-session-footer-shell px-6 py-6 text-left shadow-2xl ring-1 ring-work-session-footer-shell sm:px-8 sm:py-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            {showGlyph ? (
              <div className="shrink-0">
                <PixelGlyph placement="inline" size="sm" />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <h3 className="text-work-session-title text-lg font-medium tracking-tight">
                {title}
              </h3>
              <p className="text-work-session-subtitle mt-1 text-sm tracking-wide">
                {subtitle}
              </p>
            </div>
          </div>

          {onAbort ? (
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "shrink-0 rounded-full border border-[rgb(71_85_105)] !bg-transparent !text-[rgb(203_213_225)] !shadow-none ring-0 transition-colors",
                "hover:!border-red-500/60 hover:!bg-[rgb(69_10_10/0.4)] hover:!text-red-200",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
              disabled={abortDisabled}
              onClick={onAbort}
            >
              {abortLabel}
            </Button>
          ) : null}
        </div>

        <div className="mt-2 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[13px] font-medium tracking-wide">
            <span className="text-work-session-caption text-[10px] uppercase tracking-widest">
              {etaLabel ?? "Fortschritt"}
            </span>
            {displayPct !== null ? (
              <span className="text-work-session-stat font-mono">{displayPct}%</span>
            ) : (
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-work-session-subtitle text-[10px] uppercase tracking-widest"
              >
                Verarbeitung …
              </motion.span>
            )}
          </div>

          <div className="bg-work-session-progress-track relative h-2.5 w-full overflow-hidden rounded-full shadow-inner">
            {indeterminate ? (
              <motion.div
                className="absolute inset-y-0 left-0 h-full w-1/3 rounded-full bg-indigo-500"
                animate={{ x: ["-100%", "400%"] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <motion.div
                className="relative h-full rounded-full bg-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${displayPct ?? 0}%` }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
              />
            )}
          </div>

          {message ? (
            <motion.p
              key={message}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-work-session-subtitle text-xs font-medium tracking-wide"
            >
              {message}
            </motion.p>
          ) : null}
        </div>
      </div>
    </motion.footer>
  );
};
