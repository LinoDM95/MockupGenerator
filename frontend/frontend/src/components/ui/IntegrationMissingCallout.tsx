import { ArrowRight } from "lucide-react";

import { cn } from "../../lib/cn";
import { Button } from "./Button";

type Variant = "amber" | "slate";

type Props = {
  title: string;
  description: string;
  actionLabel: string;
  onSetup: () => void;
  variant?: Variant;
  className?: string;
};

const variantClass: Record<Variant, string> = {
  amber:
    "border-amber-200 bg-amber-50/90 text-amber-950 [&_.callout-desc]:text-amber-900/90",
  slate: "border-slate-200 bg-slate-50 text-slate-900 [&_.callout-desc]:text-slate-600",
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
    role="status"
    className={cn(
      "rounded-xl border px-4 py-3 text-sm shadow-sm",
      variantClass[variant],
      className,
    )}
  >
    <p className="font-medium">{title}</p>
    <p className="callout-desc mt-1 text-xs leading-relaxed">{description}</p>
    <Button
      type="button"
      variant="outline"
      className={cn(
        "mt-3 gap-1.5 text-xs",
        variant === "amber"
          ? "border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-100",
      )}
      onClick={onSetup}
    >
      {actionLabel}
      <ArrowRight size={14} aria-hidden />
    </Button>
  </div>
);
