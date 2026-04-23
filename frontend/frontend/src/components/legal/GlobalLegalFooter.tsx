import { Zap } from "lucide-react";

import { getLegalSiteConfig } from "../../lib/legal/config";
import { LegalFooterNav } from "./LegalFooterNav";

/**
 * Fußzeile: Produktname, Copyright und Links (Impressum / Datenschutz / AGB).
 * Im normalen Dokumentfluss; umgebendes Layout: `flex min-h-screen flex-col` + `flex-1` für den Inhalt.
 */
export const GlobalLegalFooter = () => {
  const { appName } = getLegalSiteConfig();
  const year = new Date().getFullYear();

  return (
    <footer
      className="w-full shrink-0 border-t border-zinc-200/80 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95"
      role="contentinfo"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex items-center gap-2 text-sm font-bold tracking-tight text-zinc-900 sm:text-base dark:text-zinc-100">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 shadow-sm dark:bg-zinc-100"
              aria-hidden
            >
              <Zap size={16} className="text-white dark:text-zinc-900" fill="currentColor" strokeWidth={2} />
            </span>
            {appName}
          </span>
          <p className="text-xs font-medium text-zinc-500 sm:text-sm">
            © {year} Alle Rechte vorbehalten.
          </p>
        </div>
        <LegalFooterNav dense className="text-zinc-600" />
      </div>
    </footer>
  );
};
