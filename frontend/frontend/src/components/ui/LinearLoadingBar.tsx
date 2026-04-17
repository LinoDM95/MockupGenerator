import { motion, useReducedMotion } from "framer-motion";

type Props = { message: string };

export const LinearLoadingBar = ({ message }: Props) => {
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="mb-6 overflow-hidden rounded-2xl bg-indigo-50/80 p-4 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-inset ring-indigo-500/15"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-900/70">{message}</p>
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-[10px] font-bold tracking-widest text-indigo-500"
        >
          Processing
        </motion.span>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-indigo-900/10 shadow-inner">
        {reduceMotion ? (
          <div className="absolute left-0 top-0 h-full w-1/3 rounded-full bg-indigo-500" />
        ) : (
          <motion.div
            aria-hidden
            className="absolute left-0 top-0 h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-indigo-500 to-fuchsia-500"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white opacity-75 mix-blend-overlay blur-[4px]" />
          </motion.div>
        )}
      </div>
    </div>
  );
};
