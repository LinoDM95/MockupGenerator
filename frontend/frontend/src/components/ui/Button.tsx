import { motion, useReducedMotion } from "framer-motion";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "../../lib/cn";

const variants: Record<string, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm border border-transparent",
  secondary:
    "bg-slate-900 text-white hover:bg-slate-800 border border-transparent",
  outline:
    "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400",
  danger: "bg-red-600 text-white hover:bg-red-700 border border-transparent",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent",
};

export type ButtonVariant = keyof typeof variants;

type Props = Omit<ComponentPropsWithoutRef<typeof motion.button>, "children"> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

export const Button = ({
  variant = "primary",
  className,
  type = "button",
  children,
  ...rest
}: Props) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type={type}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.8 }}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-[background-color,border-color,box-shadow,color,opacity] duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
};
