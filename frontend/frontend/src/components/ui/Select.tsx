import type { SelectHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

export const Select = ({ label, className, id, children, ...rest }: Props) => {
  const sid = id ?? rest.name;
  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={sid}
          className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      ) : null}
      <select
        id={sid}
        className={cn(
          "w-full cursor-pointer rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:bg-slate-900/70 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-indigo-500/20 dark:disabled:bg-slate-900/40 dark:disabled:text-slate-500",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
};
