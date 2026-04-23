import { motion, useReducedMotion } from "framer-motion";
import type { HTMLAttributes, ReactNode } from "react";

import {
  cardHoverShadowAccent,
  cardHoverShadowDefault,
  cardSurfaceElevationAccent,
  cardSurfaceElevationDefault,
} from "../../../lib/ui/cardSurface";
import { cn } from "../../../lib/ui/cn";
import { workspaceEmbeddedCardClassName } from "../../../lib/ui/workspaceSurfaces";

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
  /**
   * `default` / `accent`: helle Kachel auf dem Seitengrund.
   * `embedded`: sekundäre Fläche (z. B. linke Sidebar) — leicht getönt, Inset-Ring,
   * damit sie sich von den weißen Inhaltskarten (Motive, Dropzone) abhebt.
   * `bordered`: 1px-Rahmen (PrintFlow-Redesign / dichtere Oberflächen).
   */
  variant?: "default" | "accent" | "embedded" | "bordered";
  interactive?: boolean;
};

const pad: Record<NonNullable<Props["padding"]>, string> = {
  none: "p-0",
  sm: "p-5",
  md: "p-6",
  lg: "p-8",
};

const variantClass: Record<NonNullable<Props["variant"]>, string> = {
  default: cn("relative rounded-2xl border border-transparent", cardSurfaceElevationDefault),
  accent: cn("relative rounded-[2rem] border border-transparent", cardSurfaceElevationAccent),
  embedded: workspaceEmbeddedCardClassName,
  bordered: cn(
    "relative rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_0_rgb(9,9,11,0.04)] dark:border-[color:var(--pf-border)] dark:bg-[color:var(--pf-bg-elevated)] dark:shadow-[var(--pf-shadow-sm)]",
  ),
};

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
  const hoverShadow =
    variant === "accent"
      ? cardHoverShadowAccent
      : variant === "embedded"
        ? "0 4px 14px rgb(0,0,0,0.05)"
        : variant === "bordered"
          ? "0 4px 6px -1px rgb(9,9,11,0.05)"
          : cardHoverShadowDefault;

  if (isInteractive) {
    return (
      <motion.div
        onClick={onClick}
        whileHover={
          reduceMotion
            ? undefined
            : {
                y: -2,
                boxShadow: hoverShadow,
              }
        }
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          surface,
          pad[padding],
          variant === "bordered"
            ? "cursor-pointer transition-colors hover:border-zinc-300 dark:hover:border-zinc-600"
            : "cursor-pointer transition-colors hover:border-indigo-200",
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
