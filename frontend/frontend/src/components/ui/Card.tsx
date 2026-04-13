import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  padding?: "sm" | "md" | "lg";
};

const pad: Record<NonNullable<Props["padding"]>, string> = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export const Card = ({
  children,
  className,
  padding = "md",
  ...rest
}: Props) => (
  <div
    className={cn(
      "rounded-2xl border border-neutral-200 bg-white shadow-sm",
      pad[padding],
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);
