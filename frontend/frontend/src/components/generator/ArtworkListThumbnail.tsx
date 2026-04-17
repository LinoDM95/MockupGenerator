import { Loader2 } from "lucide-react";

import { cn } from "../../lib/cn";

type Props = {
  /** Nur kleines JPEG-Object-URL — nie die volle Auflösung für die Liste. */
  previewUrl?: string;
  className?: string;
  imgClassName?: string;
  variant?: "light" | "dark";
};

/**
 * Listen-Vorschau: zeigt nur `previewUrl` (klein erzeugt); Platzhalter statt Vollbild-Dekodierung.
 */
export const ArtworkListThumbnail = ({
  previewUrl,
  className,
  imgClassName,
  variant = "light",
}: Props) => (
  <div
    className={cn(
      "relative shrink-0 overflow-hidden rounded-lg border",
      variant === "light"
        ? "border-slate-200 bg-slate-50"
        : "border-white/15 bg-slate-900/60",
      className,
    )}
  >
    {previewUrl ? (
      <img
        src={previewUrl}
        alt=""
        className={cn("h-full w-full object-cover", imgClassName)}
        loading="lazy"
        decoding="async"
      />
    ) : (
      <div
        className="flex h-full w-full min-h-[2.5rem] items-center justify-center"
        aria-hidden
      >
        <Loader2
          className={cn(
            "h-5 w-5 animate-spin",
            variant === "light" ? "text-slate-300" : "text-violet-400/55",
          )}
        />
      </div>
    )}
  </div>
);
