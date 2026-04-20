import { useId, useMemo } from "react";
import { motion } from "framer-motion";

import { cn } from "../../lib/cn";

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

  const squares = useMemo(() => {
    return Array.from({ length: numSquares }).map(() => ({
      x: Math.floor(Math.random() * 50),
      y: Math.floor(Math.random() * 50),
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    }));
  }, [numSquares]);

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
            className="stroke-slate-300/80"
          />
        </pattern>
      </defs>

      <svg x="-1" y="-1" className="overflow-visible">
        {squares.map((sq, i) => (
          <motion.rect
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
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
            className="fill-violet-500"
            strokeWidth="0"
          />
        ))}
      </svg>

      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
    </svg>
  );
};
