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
          className="mb-1 block cursor-pointer text-xs font-bold uppercase tracking-wide text-neutral-500"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          "w-full cursor-text rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:bg-white read-only:cursor-default disabled:cursor-not-allowed",
          className,
        )}
        {...rest}
      />
    </div>
  );
};
