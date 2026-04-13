import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";

const variants: Record<string, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 shadow-sm border border-transparent",
  secondary:
    "bg-neutral-900 text-white hover:bg-neutral-800 border border-transparent",
  outline:
    "bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50",
  danger: "bg-red-600 text-white hover:bg-red-700 border border-transparent",
  ghost: "bg-transparent text-neutral-600 hover:bg-neutral-100 border border-transparent",
};

export type ButtonVariant = keyof typeof variants;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

export const Button = ({
  variant = "primary",
  className,
  type = "button",
  children,
  ...rest
}: Props) => (
  <button
    type={type}
    className={cn(
      "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
      variants[variant],
      className,
    )}
    {...rest}
  >
    {children}
  </button>
);
