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
      className="w-full shrink-0 bg-white/90 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 backdrop-blur-xl dark:bg-slate-900/95 dark:shadow-[0_-2px_20px_rgba(0,0,0,0.45)] dark:ring-white/10"
      role="contentinfo"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-base">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/20"
              aria-hidden
            >
              <Zap size={16} className="text-white" fill="currentColor" strokeWidth={2} />
            </span>
            {appName}
          </span>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">
            © {year} Alle Rechte vorbehalten.
          </p>
        </div>
        <LegalFooterNav dense className="text-slate-600 dark:text-slate-400" />
      </div>
    </footer>
  );
};
