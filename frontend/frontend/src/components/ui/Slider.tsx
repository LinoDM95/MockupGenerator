import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  hintRight?: string;
};

export const Slider = ({ label, hintRight, className, id, ...rest }: Props) => {
  const iid = id ?? rest.name;
  return (
    <div className="w-full">
      {(label || hintRight) && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          {label ? (
            <label htmlFor={iid} className="cursor-pointer font-medium text-slate-700">
              {label}
            </label>
          ) : (
            <span />
          )}
          {hintRight ? <span className="text-xs font-medium text-slate-500">{hintRight}</span> : null}
        </div>
      )}
      <input
        id={iid}
        type="range"
        className={cn("w-full cursor-ew-resize accent-indigo-600 disabled:cursor-not-allowed", className)}
        {...rest}
      />
    </div>
  );
};
