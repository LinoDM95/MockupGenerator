import { motion, useReducedMotion } from "framer-motion";

type Props = {
  message: string;
};

export const LinearLoadingBar = ({ message }: Props) => {
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="mb-4 overflow-hidden rounded-lg border border-indigo-100 bg-indigo-50/80 px-4 py-3 shadow-sm"
    >
      <p className="mb-2 text-xs font-medium text-indigo-900">{message}</p>
      <div className="app-progress-track relative">
        {reduceMotion ? (
          <div className="app-progress-fill app-progress-fill-glow-subtle h-full w-[38%]" />
        ) : (
          <motion.div
            aria-hidden
            className="app-progress-fill app-progress-fill-glow-subtle absolute top-0 h-full w-[38%]"
            initial={{ left: "-38%" }}
            animate={{ left: "100%" }}
            transition={{
              repeat: Infinity,
              duration: 1.15,
              ease: "linear",
            }}
          />
        )}
      </div>
    </div>
  );
};
