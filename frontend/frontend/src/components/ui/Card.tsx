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
  /** Wenn true: Hover-Lift. Wenn nicht gesetzt: aktiv bei `onClick`, außer `interactive={false}`. */
  interactive?: boolean;
};

const pad: Record<NonNullable<Props["padding"]>, string> = {
  sm: "p-5",
  md: "p-6",
  lg: "p-8",
};

const baseClass =
  "rounded-xl border border-slate-200 bg-white shadow-sm";

export const Card = ({
  children,
  className,
  padding = "md",
  interactive,
  onClick,
  ...rest
}: Props) => {
  const reduceMotion = useReducedMotion();
  const isInteractive =
    interactive === true || (interactive !== false && typeof onClick === "function");

  if (isInteractive) {
    return (
      <motion.div
        onClick={onClick}
        whileHover={
          reduceMotion
            ? undefined
            : { y: -2, boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.06)" }
        }
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(baseClass, pad[padding], className)}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={cn(baseClass, pad[padding], className)} onClick={onClick} {...rest}>
      {children}
    </div>
  );
};
