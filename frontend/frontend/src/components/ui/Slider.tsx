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
        <div className="mb-1 flex items-center justify-between text-xs font-bold uppercase text-neutral-500">
          {label ? (
            <label htmlFor={iid} className="cursor-pointer tracking-wide">
              {label}
            </label>
          ) : (
            <span />
          )}
          {hintRight ? <span className="normal-case text-neutral-700">{hintRight}</span> : null}
        </div>
      )}
      <input
        id={iid}
        type="range"
        className={cn("w-full cursor-ew-resize accent-blue-600 disabled:cursor-not-allowed", className)}
        {...rest}
      />
    </div>
  );
};
