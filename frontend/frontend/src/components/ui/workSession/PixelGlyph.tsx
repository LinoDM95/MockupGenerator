import { motion, useReducedMotion } from "framer-motion";

export type PixelGlyphPlacement = "inline";
export type PixelGlyphSize = "sm" | "md";

export type PixelGlyphProps = {
  placement?: PixelGlyphPlacement;
  /** sm = dezent (Footer); md = zentriertes Overlay */
  size?: PixelGlyphSize;
  className?: string;
};

// High-End Apple Style Config
const sizeClasses = {
  sm: {
    wrap: "h-10 w-10",
    glowWrap: "inset-[-8px]",
    innerContainer: "p-1.5 rounded-xl gap-1",
    tile: "h-2.5 w-2.5 rounded-[4px]",
    laser: "h-[1px] w-full",
  },
  md: {
    wrap: "h-24 w-24", // Größer für mehr Impact im Overlay
    glowWrap: "inset-[-20px]",
    innerContainer: "p-3 rounded-3xl gap-2",
    tile: "h-6 w-6 rounded-lg",
    laser: "h-[2px] w-full",
  },
};

// Easing-Kurve im Apple-Style (Snappy aber butterweich)
const appleEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * The "Creative Engine" Glyph — Ein Premium Lade-Batch für Print-on-Demand SaaS.
 */
export const PixelGlyph = ({ size = "md", className = "" }: PixelGlyphProps) => {
  const reduceMotion = useReducedMotion();
  const sc = sizeClasses[size];
  const isSm = size === "sm";

  const outerClass = `relative flex shrink-0 items-center justify-center ${sc.wrap} ${className}`;

  if (reduceMotion) {
    return (
      <div className={outerClass} aria-hidden>
        <div
          className={`grid grid-cols-2 ${sc.innerContainer} border border-[rgb(255_255_255/0.1)] bg-work-session-glyph-static shadow-2xl`}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${sc.tile} bg-indigo-500`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={outerClass} aria-hidden>
      {/* 1. Ambient Glow Background (Rotierender Mesh-Gradient) */}
      <motion.div
        className={`pointer-events-none absolute ${sc.glowWrap} rounded-full opacity-40 mix-blend-screen blur-xl`}
        style={{
          background:
            "conic-gradient(from 0deg, #6366f1, #a855f7, #ec4899, #6366f1)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {/* 2. Main Glass Container */}
      <motion.div
        className={`relative grid grid-cols-2 overflow-hidden border border-[rgb(255_255_255/0.15)] bg-work-session-glyph-face shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${sc.innerContainer}`}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: appleEase }}
      >
        {/* 3. Der "Print Scanner" (Laser-Linie, die nach unten fährt) */}
        {!isSm && (
          <motion.div
            className={`absolute left-0 top-0 z-10 ${sc.laser} bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.8)]`}
            animate={{ y: ["-10%", "150%"] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 0.5,
            }}
          />
        )}

        {/* 4. Die Kacheln (Design, Text, SEO, Upload) füllen sich auf */}
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className={`${sc.tile} relative overflow-hidden bg-white/5 ring-1 ring-inset ring-white/10 shadow-inner`}
          >
            {/* Der flüssige Fill-Effekt in den Kacheln */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-indigo-400 via-violet-500 to-fuchsia-500"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "reverse",
                ease: appleEase,
                delay: i * 0.2, // Treppen-Effekt (1, dann 2, dann 3...)
              }}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
