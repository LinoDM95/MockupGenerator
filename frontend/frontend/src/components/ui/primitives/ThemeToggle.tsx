import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { useColorScheme } from "../../../hooks/useColorScheme";
import { mulberry32, randomBetween } from "../../../lib/common/seededRng";
import { cn } from "../../../lib/ui/cn";
import type { ColorSchemeMode } from "../../../lib/ui/colorScheme";

/**
 * Cinematic Theme-Wechsel (Mond, Nacht-Radial, Strahlen, Sterne / Sonne, Funken).
 * Anbindung: `useColorScheme` + `pf-color-scheme` (kein extra themeStore nötig).
 */

export const THEME_ARC_DURATION_MS = 2000;
export const THEME_SUN_DURATION_MS = 1700;

const STAR_COUNT = 18;
const SPARK_COUNT = 22;

type OverlayPhase = {
  direction: "to-dark" | "to-light";
  startedAt: number;
};

const useStars = (seed: number) =>
  useMemo(() => {
    const rng = mulberry32(seed ^ 0x2f1b3c4d);
    return Array.from({ length: STAR_COUNT }, (_, i) => {
      const angle = (i / STAR_COUNT) * Math.PI * 2 + rng() * 0.9;
      const distance = randomBetween(rng, 96, 300);
      return {
        id: `${seed}-${i}`,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        delay: rng() * 0.9,
        size: randomBetween(rng, 2, 5),
        duration: randomBetween(rng, 1.2, 2.0),
      };
    });
  }, [seed]);

const useSparks = (seed: number) =>
  useMemo(() => {
    const rng = mulberry32(seed ^ 0x4d1f9a2e);
    return Array.from({ length: SPARK_COUNT }, (_, i) => {
      const angle = (i / SPARK_COUNT) * Math.PI * 2 + rng() * 0.4;
      const distance = randomBetween(rng, 120, 320);
      return {
        id: `${seed}-${i}`,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        delay: rng() * 0.35,
        size: randomBetween(rng, 3, 7),
        duration: randomBetween(rng, 0.9, 1.6),
      };
    });
  }, [seed]);

const MoonSickle = () => (
  <svg
    viewBox="0 0 120 120"
    className="h-full w-full"
    style={{
      transform: "translate(-50%, -50%)",
      position: "absolute",
      left: "50%",
      top: "50%",
    }}
    aria-hidden
  >
    <defs>
      <radialGradient id="moon-body" cx="40%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#eef2ff" />
        <stop offset="45%" stopColor="#a5b4fc" />
        <stop offset="100%" stopColor="#4f46e5" />
      </radialGradient>
      <radialGradient id="moon-glow" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="rgba(224,231,255,1)" />
        <stop offset="45%" stopColor="rgba(129,140,248,0.78)" />
        <stop offset="72%" stopColor="rgba(99,102,241,0.45)" />
        <stop offset="100%" stopColor="rgba(67,56,202,0)" />
      </radialGradient>
    </defs>
    <circle cx="60" cy="60" r="58" fill="url(#moon-glow)" />
    <mask id="sickle-mask">
      <rect width="120" height="120" fill="black" />
      <circle cx="60" cy="60" r="38" fill="white" />
      <circle cx="76" cy="52" r="34" fill="black" />
    </mask>
    <g mask="url(#sickle-mask)">
      <circle cx="60" cy="60" r="40" fill="url(#moon-body)" />
    </g>
  </svg>
);

const SunOrb = () => (
  <svg viewBox="0 0 220 220" className="h-full w-full" aria-hidden>
    <defs>
      <radialGradient id="sun-body" cx="50%" cy="45%" r="55%">
        <stop offset="0%" stopColor="#fff7c2" />
        <stop offset="55%" stopColor="#fcd34d" />
        <stop offset="100%" stopColor="#f59e0b" />
      </radialGradient>
      <radialGradient id="sun-halo" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="rgba(253,224,71,0.7)" />
        <stop offset="60%" stopColor="rgba(253,186,71,0.2)" />
        <stop offset="100%" stopColor="rgba(253,186,71,0)" />
      </radialGradient>
    </defs>
    <circle cx="110" cy="110" r="108" fill="url(#sun-halo)" />
    <circle cx="110" cy="110" r="68" fill="url(#sun-body)" />
  </svg>
);

const SunRays = () => {
  const rays = Array.from({ length: 12 });
  return (
    <svg viewBox="0 0 420 420" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="ray-grad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="rgba(253,224,71,0)" />
          <stop offset="50%" stopColor="rgba(253,224,71,0.9)" />
          <stop offset="100%" stopColor="rgba(253,186,71,0)" />
        </linearGradient>
      </defs>
      <g transform="translate(210 210)">
        {rays.map((_, i) => (
          <rect
            key={i}
            x={-4}
            y={-200}
            width={8}
            height={120}
            rx={4}
            fill="url(#ray-grad)"
            transform={`rotate(${(i / rays.length) * 360})`}
          />
        ))}
      </g>
    </svg>
  );
};

const MoonRays = () => {
  const rays = Array.from({ length: 12 });
  return (
    <svg viewBox="0 0 420 420" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="moon-ray-grad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="rgba(196,181,253,0)" />
          <stop offset="38%" stopColor="rgba(221,214,254,0.98)" />
          <stop offset="52%" stopColor="rgba(167,139,250,0.95)" />
          <stop offset="100%" stopColor="rgba(79,70,229,0)" />
        </linearGradient>
      </defs>
      <g transform="translate(210 210)">
        {rays.map((_, i) => (
          <rect
            key={i}
            x={-4}
            y={-200}
            width={8}
            height={120}
            rx={4}
            fill="url(#moon-ray-grad)"
            transform={`rotate(${(i / rays.length) * 360})`}
          />
        ))}
      </g>
    </svg>
  );
};

const MoonIconMini = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <defs>
      <linearGradient id="mini-moon" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e0e7ff" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    <path
      d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"
      fill="url(#mini-moon)"
      stroke="currentColor"
      strokeOpacity={0.25}
      strokeWidth={1}
    />
  </svg>
);

const SunIconMini = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <defs>
      <radialGradient id="mini-sun" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fef3c7" />
        <stop offset="100%" stopColor="#f59e0b" />
      </radialGradient>
    </defs>
    <circle cx="12" cy="12" r="4" fill="url(#mini-sun)" />
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <line x1="12" y1="2.5" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="21.5" />
      <line x1="2.5" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="21.5" y2="12" />
      <line x1="5" y1="5" x2="6.8" y2="6.8" />
      <line x1="17.2" y1="17.2" x2="19" y2="19" />
      <line x1="5" y1="19" x2="6.8" y2="17.2" />
      <line x1="17.2" y1="6.8" x2="19" y2="5" />
    </g>
  </svg>
);

type OverlayProps = { phase: OverlayPhase };

const ThemeTransitionOverlay = ({ phase }: OverlayProps) => {
  const stars = useStars(phase.startedAt);
  const sparks = useSparks(phase.startedAt);
  const isToDark = phase.direction === "to-dark";
  const arcMs = THEME_ARC_DURATION_MS;
  const sunMs = THEME_SUN_DURATION_MS;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[10000] overflow-hidden"
      style={{ contain: "strict" }}
    >
      {isToDark ? (
        <>
          <div
            className="absolute left-1/2 top-1/2 h-[160vh] w-[160vw] -translate-x-1/2 -translate-y-1/2"
            style={{
              background:
                "radial-gradient(closest-side, rgba(238,242,255,0.88) 0%, rgba(199,210,254,0.62) 28%, rgba(165,180,252,0.48) 44%, rgba(129,140,248,0.38) 56%, rgba(99,102,241,0.28) 66%, rgba(76,29,149,0.16) 78%, transparent 88%)",
              animation: `theme-night-sweep ${arcMs}ms cubic-bezier(0.22,1,0.36,1) forwards`,
              mixBlendMode: "screen",
            }}
          />
          <motion.div
            className="absolute inset-0 bg-indigo-950"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{
              duration: arcMs / 1000,
              times: [0, 0.55, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-[120px] w-[120px]"
            style={{
              animation: `theme-moon-arc ${arcMs}ms cubic-bezier(0.22,1,0.36,1) forwards`,
              willChange: "transform, opacity, filter",
            }}
          >
            <MoonSickle />
          </div>
          <div
            className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2"
            style={{
              animation: `theme-moon-rays ${arcMs}ms cubic-bezier(0.22,1,0.36,1) forwards`,
              willChange: "transform, opacity",
            }}
          >
            <MoonRays />
          </div>
          <div className="absolute left-1/2 top-1/2">
            {stars.map((s) => (
              <span
                key={s.id}
                className="absolute rounded-full bg-indigo-300"
                style={
                  {
                    width: s.size,
                    height: s.size,
                    boxShadow:
                      "0 0 10px rgba(167, 139, 250, 1), 0 0 22px rgba(99, 102, 241, 0.85)",
                    ["--px"]: `${s.dx}px`,
                    ["--py"]: `${s.dy}px`,
                    animation: `theme-star-fall ${s.duration}s ease-out ${s.delay}s forwards`,
                    top: 0,
                    left: 0,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div
            className="absolute left-1/2 top-1/2 h-[160vh] w-[160vw] -translate-x-1/2 -translate-y-1/2"
            style={{
              background:
                "radial-gradient(closest-side, rgba(255,236,170,0.55) 0%, rgba(255,210,120,0.3) 35%, rgba(255,180,90,0.08) 60%, transparent 78%)",
              animation: `theme-light-sweep ${sunMs}ms cubic-bezier(0.22,1,0.36,1) forwards`,
              mixBlendMode: "screen",
            }}
          />
          <motion.div
            className="absolute inset-0 bg-amber-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.55, 0] }}
            transition={{
              duration: sunMs / 1000,
              times: [0, 0.45, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-[220px] w-[220px]"
            style={{
              animation: `theme-sun-rise ${sunMs}ms cubic-bezier(0.22,1,0.36,1) forwards`,
              willChange: "transform, opacity, filter",
            }}
          >
            <SunOrb />
          </div>
          <div
            className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2"
            style={{
              animation: `theme-sun-rays ${sunMs}ms cubic-bezier(0.22,1,0.36,1) forwards`,
              willChange: "transform, opacity",
            }}
          >
            <SunRays />
          </div>
          <div className="absolute left-1/2 top-1/2">
            {sparks.map((s) => (
              <span
                key={s.id}
                className="absolute rounded-full bg-amber-200"
                style={
                  {
                    width: s.size,
                    height: s.size,
                    boxShadow: "0 0 10px rgba(253, 186, 71, 0.95)",
                    ["--px"]: `${s.dx}px`,
                    ["--py"]: `${s.dy}px`,
                    animation: `theme-spark-burst ${s.duration}s cubic-bezier(0.22,1,0.36,1) ${s.delay}s forwards`,
                    top: 0,
                    left: 0,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

type ThemeToggleProps = {
  className?: string;
  variant?: "default" | "onDarkSurface";
  size?: "sm" | "md";
};

export const ThemeToggle = ({
  className,
  variant = "default",
  size = "md",
}: ThemeToggleProps) => {
  const { isDark, setMode, toggleLightDark } = useColorScheme();
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<OverlayPhase | null>(null);
  const busy = phase !== null;

  const dim = size === "sm" ? 32 : 36;

  useEffect(() => {
    if (!phase) return;
    const toDark = phase.direction === "to-dark";
    const total = toDark ? THEME_ARC_DURATION_MS : THEME_SUN_DURATION_MS;
    const flipDelay = Math.round(
      toDark ? THEME_ARC_DURATION_MS * 0.5 : THEME_SUN_DURATION_MS * 0.35,
    );
    const next: ColorSchemeMode = toDark ? "dark" : "light";
    const flipTimer = window.setTimeout(() => {
      setMode(next);
    }, flipDelay);
    const endTimer = window.setTimeout(() => {
      setPhase(null);
    }, total + 80);
    return () => {
      window.clearTimeout(flipTimer);
      window.clearTimeout(endTimer);
    };
  }, [phase, setMode]);

  const handleClick = useCallback(() => {
    if (busy) return;
    if (reduceMotion) {
      toggleLightDark();
      return;
    }
    setPhase({
      direction: isDark ? "to-light" : "to-dark",
      startedAt: Date.now(),
    });
  }, [busy, reduceMotion, isDark, toggleLightDark]);

  const label = isDark
    ? "Zum hellen Erscheinungsbild wechseln"
    : "Zum dunklen Erscheinungsbild wechseln";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-label={label}
        title={label}
        aria-busy={busy}
        className={cn(
          "group relative flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-slate-900/5 transition-all duration-200 ease-out",
          !reduceMotion && "hover:scale-[1.07] active:scale-[0.96]",
          variant === "onDarkSurface"
            ? cn(
                "bg-white/10 text-indigo-100/90 ring-white/15",
                "hover:bg-white/15 hover:text-white hover:ring-white/30",
                "hover:shadow-[0_0_28px_rgba(167,139,250,0.35),0_4px_20px_rgba(0,0,0,0.2)]",
              )
            : cn(
                "bg-gradient-to-br from-white to-slate-50 text-slate-600",
                "hover:text-indigo-600 hover:ring-indigo-500/20",
                "hover:shadow-[0_10px_32px_-6px_rgba(15,23,42,0.12),0_0_24px_-4px_rgba(99,102,241,0.2)]",
              ),
          busy && "cursor-wait opacity-70",
          className,
        )}
        style={{ width: dim, height: dim }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full opacity-80"
          style={{
            background:
              isDark
                ? "radial-gradient(closest-side, rgba(167,139,250,0.55), rgba(99,102,241,0.22) 45%, transparent 72%)"
                : "radial-gradient(closest-side, rgba(253,224,71,0.4), transparent 70%)",
          }}
        />
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="moon"
              initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="theme-toggle-idle-moon relative flex items-center justify-center"
            >
              <MoonIconMini />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: 90, scale: 0.4, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="theme-toggle-idle-sun relative flex items-center justify-center"
            >
              <SunIconMini />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {phase && typeof document !== "undefined"
        ? createPortal(<ThemeTransitionOverlay phase={phase} />, document.body)
        : null}
    </>
  );
};
