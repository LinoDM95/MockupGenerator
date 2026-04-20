import { ArrowRight } from "lucide-react";

import { cn } from "../../../lib/ui/cn";
import { Button } from "../primitives/Button";

type Variant = "amber" | "slate" | "indigo";

type Props =
  | {
      title: string;
      description: string;
      actionLabel: string;
      onSetup: () => void;
      variant?: Variant;
      className?: string;
    }
  | {
      title: string;
      description: string;
      actionLabel: string;
      href: string;
      download?: string;
      variant?: Variant;
      className?: string;
    };

const variantClass: Record<Variant, string> = {
  amber: "bg-amber-50 ring-1 ring-inset ring-amber-500/20 text-amber-900",
  slate: "bg-slate-50 ring-1 ring-inset ring-slate-900/5 text-slate-800",
  indigo: "bg-indigo-50 ring-1 ring-inset ring-indigo-500/20 text-indigo-900",
};

const downloadLinkClass =
  "mt-4 inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";

export const IntegrationMissingCallout = (props: Props) => {
  const { title, description, actionLabel, variant = "amber", className } =
    props;

  return (
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

        {"href" in props ? (
          <a
            href={props.href}
            download={props.download}
            className={downloadLinkClass}
          >
            {actionLabel}
          </a>
        ) : (
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
            onClick={props.onSetup}
          >
            {actionLabel}
            <ArrowRight size={14} className="ml-1 opacity-70" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
};
