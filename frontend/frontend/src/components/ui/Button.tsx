import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "premium";
  size?: "sm" | "md" | "lg";
};

export type ButtonVariant = NonNullable<ButtonProps["variant"]>;

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 focus-visible:ring-indigo-500/50 dark:bg-indigo-500 dark:hover:bg-indigo-400",
  secondary:
    "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus-visible:ring-indigo-500/50 dark:bg-indigo-950/55 dark:text-indigo-300 dark:hover:bg-indigo-950/80",
  outline:
    "bg-white text-slate-700 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 hover:bg-slate-50 focus-visible:ring-slate-500/50 dark:bg-slate-900/60 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-slate-800/90",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-500/50 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100",
  danger:
    "bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-500/50 dark:bg-red-950/45 dark:text-red-300 dark:hover:bg-red-950/65",
  premium:
    "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20 hover:scale-[1.02] hover:from-indigo-600 hover:to-violet-700 focus-visible:ring-indigo-500/40 active:scale-[0.98]",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      children,
      disabled,
      type = "button",
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold tracking-wide transition-all duration-200 ease-out focus:outline-none focus-visible:ring-4 active:scale-[0.97]",
        variantStyles[variant],
        sizeStyles[size],
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
);

Button.displayName = "Button";
