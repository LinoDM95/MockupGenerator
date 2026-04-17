import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export type ButtonVariant = NonNullable<ButtonProps["variant"]>;

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-slate-900 text-white shadow-sm hover:bg-indigo-600 focus-visible:ring-indigo-500/50",
  secondary:
    "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus-visible:ring-indigo-500/50",
  outline:
    "bg-white text-slate-700 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 hover:bg-slate-50 focus-visible:ring-slate-500/50",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-500/50",
  danger:
    "bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-500/50",
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
