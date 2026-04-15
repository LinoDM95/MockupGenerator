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
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      ) : null}
      <select
        id={sid}
        className={cn(
          "w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
};
