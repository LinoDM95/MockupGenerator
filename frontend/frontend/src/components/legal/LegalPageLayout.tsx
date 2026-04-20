import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "../../lib/cn";
import { getLegalSiteConfig, legalConfigLooksIncomplete } from "../../lib/legal/config";
import { ThemeToggle } from "../ui/ThemeToggle";

type Props = {
  title: string;
  children: ReactNode;
};

export const LegalPageLayout = ({ title, children }: Props) => {
  const cfg = getLegalSiteConfig();
  const showDevHint = import.meta.env.DEV && legalConfigLooksIncomplete(cfg);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
            Startseite
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden text-sm font-semibold text-slate-600 hover:text-indigo-600 sm:inline"
            >
              Anmelden
            </Link>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 pb-16 sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Rechtliches · {cfg.appName}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>

        {showDevHint ? (
          <div
            className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-inset ring-amber-500/25"
            role="status"
          >
            Hinweis (nur Entwicklung): Impressum-Kontaktdaten sind unvollständig — bitte{" "}
            <code className="rounded bg-white/80 px-1 font-mono text-xs">VITE_LEGAL_*</code> in{" "}
            <code className="rounded bg-white/80 px-1 font-mono text-xs">frontend/frontend/.env</code>{" "}
            setzen.
          </div>
        ) : null}

        <div
          className={cn(
            "mt-8 space-y-5 text-sm font-medium leading-relaxed text-slate-700",
            "[&_h2]:mt-10 [&_h2]:text-base [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-slate-900 [&_h2]:first:mt-0",
            "[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
            "[&_a]:font-semibold [&_a]:text-indigo-600 [&_a]:underline [&_a]:decoration-indigo-600/30 [&_a]:underline-offset-2 hover:[&_a]:text-indigo-700",
          )}
        >
          {children}
        </div>

        <nav
          className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200/80 pt-8 text-sm font-semibold text-slate-600"
          aria-label="Weitere Rechtstexte"
        >
          <Link to="/impressum" className="hover:text-indigo-600">
            Impressum
          </Link>
          <Link to="/datenschutz" className="hover:text-indigo-600">
            Datenschutz
          </Link>
          <Link to="/agb" className="hover:text-indigo-600">
            AGB
          </Link>
        </nav>
      </main>
    </div>
  );
};
