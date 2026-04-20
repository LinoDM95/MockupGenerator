import { Link } from "react-router-dom";

import { cn } from "../../lib/cn";

type Props = {
  className?: string;
  /** Kleinere Abstände z. B. unter Login-Card */
  dense?: boolean;
  align?: "center" | "start";
};

export const LegalFooterNav = ({ className, dense, align = "center" }: Props) => (
  <nav
    aria-label="Rechtliches"
    className={cn(
      "flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500",
      align === "start" ? "justify-start" : "justify-center",
      !dense && "sm:gap-x-5 sm:text-sm",
      className,
    )}
  >
    <Link to="/impressum" className="transition-colors hover:text-indigo-600">
      Impressum
    </Link>
    <span className="text-slate-300" aria-hidden>
      ·
    </span>
    <Link to="/datenschutz" className="transition-colors hover:text-indigo-600">
      Datenschutz
    </Link>
    <span className="text-slate-300" aria-hidden>
      ·
    </span>
    <Link to="/agb" className="transition-colors hover:text-indigo-600">
      AGB
    </Link>
  </nav>
);
