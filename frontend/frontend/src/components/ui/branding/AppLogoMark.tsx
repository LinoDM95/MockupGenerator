import { Zap } from "lucide-react";

import { cn } from "../../../lib/ui/cn";

const defaultTileClass =
  "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 shadow-inner ring-1 ring-inset ring-white/25";

type Props = {
  className?: string;
  /** Ersetzt oder erweitert die Standard-Kachelgröße/-form (z. B. `h-8 w-8 rounded-lg`). */
  tileClassName?: string;
  iconSize?: number;
};

/** Einheitliches PrintFlow-Zeichen (Indigo–Violett–Fuchsia) für Sidebar, Login, Footer, Landing. */
export const AppLogoMark = ({
  className,
  tileClassName,
  iconSize = 13,
}: Props) => (
  <span className={cn(defaultTileClass, tileClassName, className)} aria-hidden>
    <Zap size={iconSize} className="text-white" fill="currentColor" strokeWidth={0} />
  </span>
);
