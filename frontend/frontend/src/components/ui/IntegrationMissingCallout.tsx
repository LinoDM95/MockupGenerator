import { ArrowRight } from "lucide-react";

import { cn } from "../../lib/cn";
import { Button } from "./Button";

type Variant = "amber" | "slate" | "indigo";

type Props = {
  title: string;
  description: string;
  actionLabel: string;
  onSetup: () => void;
  variant?: Variant;
  className?: string;
};

const variantClass: Record<Variant, string> = {
  amber: "bg-amber-50 ring-1 ring-inset ring-amber-500/20 text-amber-900",
  slate: "bg-slate-50 ring-1 ring-inset ring-slate-900/5 text-slate-800",
  indigo: "bg-indigo-50 ring-1 ring-inset ring-indigo-500/20 text-indigo-900",
};

export const IntegrationMissingCallout = ({
  title,
  description,
  actionLabel,
  onSetup,
  variant = "amber",
  className,
}: Props) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-2xl p-5 shadow-sm",
      variantClass[variant],
      className,
    )}
    role="status"
  >
    <div className="relative z-10">
      <h4 className="text-sm font-bold tracking-tight">{title}</h4>
      <p className="mt-1 max-w-[90%] text-xs font-medium leading-relaxed opacity-80">
        {description}
      </p>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "mt-4 bg-white/60 shadow-sm ring-1 ring-black/5 hover:bg-white",
          variant === "amber" && "text-amber-900",
          variant === "slate" && "text-slate-900",
          variant === "indigo" && "text-indigo-900",
        )}
        onClick={onSetup}
      >
        {actionLabel}
        <ArrowRight size={14} className="ml-1 opacity-70" aria-hidden />
      </Button>
    </div>
  </div>
);
