import { motion } from "framer-motion";

export type BlockingProgressOverlayProps = {
  title: string;
  subtitle?: string;
  message?: string;
  current?: number;
  total?: number;
  /** Wenn gesetzt (0–100): ZIP-Packen statt Mockup-Fortschritt */
  packPercent?: number | null;
  /** Kein fester Prozentwert (z. B. Vorschau-Vorbereitung) */
  indeterminate?: boolean;
};

/** Kleines 2×2-Raster — visuell „Pixel / Hochskalieren“, passend zu Generator & Upscaler. */
const PixelUpscaleGlyph = () => (
  <div
    className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center"
    aria-hidden
  >
    <motion.div
      className="pointer-events-none absolute inset-[-4px] rounded-3xl bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-transparent"
      animate={{
        opacity: [0.5, 0.85, 0.5],
        scale: [0.96, 1.02, 0.96],
      }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    />
    <div className="grid grid-cols-2 gap-2 p-1">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="h-4 w-4 rounded-md bg-gradient-to-br from-indigo-400 via-violet-500 to-indigo-600 shadow-md shadow-indigo-500/40 ring-1 ring-white/20"
          animate={{
            scale: [0.88, 1.08, 0.88],
            opacity: [0.65, 1, 0.65],
          }}
          transition={{
            duration: 1.35,
            repeat: Infinity,
            delay: i * 0.16,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  </div>
);

export const BlockingProgressOverlay = ({
  title,
  subtitle = "Bitte kurz warten und dieses Fenster nicht schließen.",
  message = "",
  current = 0,
  total = 1,
  packPercent = null,
  indeterminate = false,
}: BlockingProgressOverlayProps) => {
  const renderPct =
    total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const barPct =
    packPercent !== null && packPercent !== undefined ? packPercent : renderPct;
  const displayPct = indeterminate ? null : Math.min(100, Math.max(0, barPct));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-slate-900/42 via-indigo-900/22 to-slate-900/48 p-6 backdrop-blur-md"
    >
      <PixelUpscaleGlyph />

      <div className="mt-2 w-full max-w-md rounded-2xl border border-white/15 bg-slate-800/50 px-8 py-6 text-center shadow-xl shadow-indigo-950/20 ring-1 ring-indigo-400/15 backdrop-blur-sm">
        <p className="text-base font-semibold tracking-tight text-white">{title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-indigo-50/90">{subtitle}</p>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-indigo-100/90">
            <span>Fortschritt</span>
            {displayPct !== null ? (
              <span className="tabular-nums text-violet-100">{displayPct}%</span>
            ) : (
              <span className="text-violet-100/85">läuft …</span>
            )}
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-700/85 ring-1 ring-inset ring-white/12">
            {indeterminate ? (
              <div className="relative h-full w-full overflow-hidden">
                <div className="overlay-progress-indeterminate absolute inset-y-0 left-0 h-full rounded-full" />
              </div>
            ) : (
              <motion.div
                className="overlay-progress-fill-glow h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400"
                initial={false}
                animate={{ width: `${displayPct}%` }}
                transition={{ type: "spring", stiffness: 140, damping: 26 }}
              />
            )}
          </div>
        </div>

        {message ? (
          <p className="mt-4 text-sm leading-snug text-indigo-50/90">{message}</p>
        ) : null}
      </div>
    </div>
  );
};
