import { motion, useReducedMotion } from "framer-motion";

import { cn } from "../../lib/ui/cn";

export type PixelglyphLoaderSize = "sm" | "md" | "lg";

export type PixelglyphLoaderProps = {
  className?: string;
  size?: PixelglyphLoaderSize;
  /** Zusätzliche Klassen am SVG (z. B. Opazität) */
  svgClassName?: string;
};

const box: Record<PixelglyphLoaderSize, string> = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

/**
 * Minimalistisches Pixel-Glyph (2×2) mit sanfter Puls-Animation — Calm Premium, Indigo-Glow.
 */
export const PixelglyphLoader = ({
  className,
  size = "md",
  svgClassName,
}: PixelglyphLoaderProps) => {
  const reduceMotion = useReducedMotion();
  const glow =
    "text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]";

  const svg = (
    <svg
      className={cn(box[size], glow, svgClassName)}
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden
    >
      <rect x="3" y="3" width="12" height="12" rx="2.5" opacity={0.92} />
      <rect x="17" y="3" width="12" height="12" rx="2.5" opacity={0.75} />
      <rect x="3" y="17" width="12" height="12" rx="2.5" opacity={0.75} />
      <rect x="17" y="17" width="12" height="12" rx="2.5" opacity={0.92} />
    </svg>
  );

  if (reduceMotion) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        {svg}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <motion.div
        animate={{ scale: [1, 1.07, 1], opacity: [0.88, 1, 0.88] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: [0.45, 0, 0.55, 1],
        }}
      >
        {svg}
      </motion.div>
    </div>
  );
};
