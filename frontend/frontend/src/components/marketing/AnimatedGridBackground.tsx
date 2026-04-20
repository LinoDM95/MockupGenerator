import { useId, useMemo } from "react";
import { motion } from "framer-motion";

import { useColorScheme } from "../../hooks/ColorSchemeProvider";
import { mulberry32 } from "../../lib/common/seededRng";
import { cn } from "../../lib/ui/cn";

/** Hero & Login: gleiche Einblendung (Light/Dark), damit die lila Kacheln dort identisch wirken. */
export const animatedGridHeroSurfaceClassName =
  "z-0 opacity-95 [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)] dark:opacity-100 dark:[mask-image:radial-gradient(ellipse_at_center,rgba(255,255,255,0.16),transparent_72%)]";

/** Lila Highlight-Kacheln — Dark: sattes Violett (violet-500), nicht blasses Lavendel; extra Chromaticity. */
const animatedSquareFillClassName =
  "fill-violet-600/62 dark:fill-violet-500/94 dark:saturate-[1.78] dark:brightness-110";

type Props = {
  width?: number;
  height?: number;
  numSquares?: number;
  className?: string;
};

/** Animiertes Raster wie auf der Landing Page — für Auth und Marketing-Hintergründe. */
export const AnimatedGridBackground = ({
  width = 40,
  height = 40,
  numSquares = 30,
  className,
}: Props) => {
  const id = useId();
  const { isDark } = useColorScheme();
  const squarePulsePeak = isDark ? 0.97 : 0.68;

  const squares = useMemo(() => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
    const rng = mulberry32(h ^ numSquares);
    return Array.from({ length: numSquares }, () => ({
      x: Math.floor(rng() * 50),
      y: Math.floor(rng() * 50),
      duration: rng() * 3 + 2,
      delay: rng() * 2,
    }));
  }, [numSquares, id]);

  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x="-1"
          y="-1"
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeWidth="1"
            className="stroke-slate-400/45 dark:stroke-slate-500/55"
          />
        </pattern>
      </defs>

      <svg x="-1" y="-1" className="overflow-visible">
        {squares.map((sq, i) => (
          <motion.rect
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, squarePulsePeak, 0] }}
            transition={{
              duration: sq.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: sq.delay,
            }}
            width={width}
            height={height}
            x={sq.x * width}
            y={sq.y * height}
            className={animatedSquareFillClassName}
            strokeWidth="0"
          />
        ))}
      </svg>

      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
    </svg>
  );
};
