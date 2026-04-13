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
          className="mb-1 block cursor-pointer text-xs font-bold uppercase tracking-wide text-neutral-500"
        >
          {label}
        </label>
      ) : null}
      <select
        id={sid}
        className={cn(
          "w-full cursor-pointer rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
};
