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
        <div className="mb-2 flex items-center justify-between text-xs font-bold tracking-wide">
          {label ? (
            <label htmlFor={iid} className="cursor-pointer text-slate-700">
              {label}
            </label>
          ) : (
            <span />
          )}
          {hintRight ? <span className="text-slate-400">{hintRight}</span> : null}
        </div>
      )}
      <input
        id={iid}
        type="range"
        className={cn(
          "h-2 w-full cursor-ew-resize appearance-none rounded-full bg-slate-200 outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50",
          "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.1)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110",
          "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.1)] [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-110",
          className,
        )}
        {...rest}
      />
    </div>
  );
};
