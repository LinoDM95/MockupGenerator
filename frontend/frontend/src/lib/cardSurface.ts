/**
 * Kanonische Oberflächen für `<Card />` auf `bg-slate-50`:
 * klarer Ring + mehrschichtiger Schatten statt „grau auf grau“.
 */

/** Ruhe-Zustand `variant="default"` */
export const cardSurfaceElevationDefault =
  "bg-white shadow-[0_1px_2px_rgba(15,23,42,0.07),0_6px_20px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/10";

/** Ruhe-Zustand `variant="accent"` */
export const cardSurfaceElevationAccent =
  "bg-white shadow-[0_4px_24px_rgba(15,23,42,0.07),0_10px_36px_rgba(67,56,202,0.1)] ring-1 ring-indigo-900/10";

/** Framer Motion `whileHover` für `variant="default"` */
export const cardHoverShadowDefault =
  "0 10px 28px rgba(15,23,42,0.1), 0 2px 8px rgba(15,23,42,0.05), 0 1px 2px rgba(15,23,42,0.06)";

/** Framer Motion `whileHover` für `variant="accent"` */
export const cardHoverShadowAccent =
  "0 14px 40px rgba(67,56,202,0.14), 0 6px 16px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.05)";
