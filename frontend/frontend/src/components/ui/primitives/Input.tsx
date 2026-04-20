import type { InputHTMLAttributes } from "react";

import { cn } from "../../../lib/ui/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & { label?: string };

export const Input = ({ label, className, id, ...rest }: Props) => {
  const inputId = id ?? rest.name;
  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-700"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          "w-full cursor-text rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 read-only:cursor-default disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:bg-slate-100 dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)] dark:ring-white/10 dark:placeholder:text-slate-500 dark:focus:ring-indigo-500/20 dark:disabled:bg-slate-200/50",
          className,
        )}
        {...rest}
      />
    </div>
  );
};
