import { motion, useReducedMotion } from "framer-motion";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";

/** DOM-Attribute ohne Events, die mit Framer Motion kollidieren. */
type DivProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "onAnimationStart" | "onAnimationEnd" | "onDrag" | "onDragStart" | "onDragEnd" | "onDragEnter" | "onDragExit"
>;

type Props = DivProps & {
  children: ReactNode;
  padding?: "sm" | "md" | "lg";
  /** `accent`: weiche Ecken + dezenter Indigo-Ring, an Overlay-Karten angelehnt (hell). */
  variant?: "default" | "accent";
  /** Wenn true: Hover-Lift. Wenn nicht gesetzt: aktiv bei `onClick`, außer `interactive={false}`. */
  interactive?: boolean;
};

const pad: Record<NonNullable<Props["padding"]>, string> = {
  sm: "p-5",
  md: "p-6",
  lg: "p-8",
};

const variantClass: Record<NonNullable<Props["variant"]>, string> = {
  default: "rounded-xl border border-slate-200 bg-white shadow-sm",
  accent:
    "rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-indigo-500/10 shadow-indigo-950/[0.04]",
};

const hoverShadowDefault =
  "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.06)";
const hoverShadowAccent =
  "0 12px 24px -4px rgb(99 102 241 / 0.12), 0 6px 12px -6px rgb(0 0 0 / 0.06)";

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
        className={cn(surface, pad[padding], className)}
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
