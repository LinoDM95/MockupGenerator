import { motion, useReducedMotion } from "framer-motion";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";

type DivProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragExit"
>;

type Props = DivProps & {
  children: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  variant?: "default" | "accent";
  interactive?: boolean;
};

const pad: Record<NonNullable<Props["padding"]>, string> = {
  none: "p-0",
  sm: "p-5",
  md: "p-6",
  lg: "p-8",
};

const variantClass: Record<NonNullable<Props["variant"]>, string> = {
  default:
    "relative rounded-2xl border border-transparent bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5",
  accent:
    "relative rounded-[2rem] border border-transparent bg-white shadow-[0_8px_24px_rgb(0,0,0,0.06)] ring-1 ring-indigo-900/5",
};

const hoverShadowDefault =
  "0 8px 24px rgb(0,0,0,0.06), 0 2px 8px rgb(0,0,0,0.04)";
const hoverShadowAccent =
  "0 12px 32px rgb(99,102,241,0.08), 0 4px 12px rgb(0,0,0,0.04)";

export const Card = ({
  children,
  className,
  padding = "md",
  variant = "default",
  interactive,
  onClick,
  ...rest
}: Props) => {
  const reduceMotion = useReducedMotion();
  const isInteractive =
    interactive === true || (interactive !== false && typeof onClick === "function");
  const surface = variantClass[variant];

  if (isInteractive) {
    return (
      <motion.div
        onClick={onClick}
        whileHover={
          reduceMotion
            ? undefined
            : {
                y: -2,
                boxShadow: variant === "accent" ? hoverShadowAccent : hoverShadowDefault,
              }
        }
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          surface,
          pad[padding],
          "cursor-pointer transition-colors hover:border-indigo-200",
          className,
        )}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={cn(surface, pad[padding], className)} onClick={onClick} {...rest}>
      {children}
    </div>
  );
};
