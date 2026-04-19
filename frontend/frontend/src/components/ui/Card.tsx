import { motion, useReducedMotion } from "framer-motion";
import type { HTMLAttributes, ReactNode } from "react";

import {
  cardHoverShadowAccent,
  cardHoverShadowDefault,
  cardSurfaceElevationAccent,
  cardSurfaceElevationDefault,
} from "../../lib/cardSurface";
import { cn } from "../../lib/cn";
import { workspaceEmbeddedCardClassName } from "../../lib/workspaceSurfaces";

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
   */
  variant?: "default" | "accent" | "embedded";
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
