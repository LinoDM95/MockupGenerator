import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export const Input = ({ label, className, id, ...rest }: Props) => {
  const inputId = id ?? rest.name;
  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          "w-full cursor-text rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 read-only:cursor-default disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
          className,
        )}
        {...rest}
      />
    </div>
  );
};
