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

const readingProseClass = cn(
  "text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300",
  "[&_h2]:mt-0 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-slate-900 dark:[&_h2]:text-slate-100",
  "[&_a]:font-semibold [&_a]:text-indigo-600 [&_a]:underline [&_a]:decoration-indigo-600/30 [&_a]:underline-offset-2 hover:[&_a]:text-indigo-700 dark:[&_a]:text-indigo-400",
  "[&_strong]:text-slate-900 dark:[&_strong]:text-slate-100",
  "[&_code]:rounded-md [&_code]:bg-slate-100/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-slate-800 dark:[&_code]:bg-slate-800/80 dark:[&_code]:text-slate-200",
);

export const LegalPageLayout = ({ title, children }: Props) => {
  const cfg = getLegalSiteConfig();
  const showDevHint = import.meta.env.DEV && legalConfigLooksIncomplete(cfg);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50/50 font-sans text-slate-900 dark:bg-slate-900/50 dark:text-slate-100">
      <header className="sticky top-0 z-20 bg-white/80 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-xl dark:bg-slate-950/80 dark:ring-white/10">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
            Startseite
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden text-sm font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 sm:inline"
            >
              Anmelden
            </Link>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Rechtliches · {cfg.appName}
        </p>
        <h1 className="mt-3 text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          {title}
        </h1>

        {showDevHint ? (
          <div
            className="mx-auto mt-10 w-full max-w-3xl rounded-2xl bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-inset ring-amber-500/25 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-500/30"
            role="status"
          >
            Hinweis (nur Entwicklung): Impressum-Kontaktdaten sind unvollständig — bitte{" "}
            <code className="rounded-md bg-white/80 px-1 font-mono text-xs dark:bg-slate-900/80">
              VITE_LEGAL_*
            </code>{" "}
            in{" "}
            <code className="rounded-md bg-white/80 px-1 font-mono text-xs dark:bg-slate-900/80">
              frontend/frontend/.env
            </code>{" "}
            setzen.
          </div>
        ) : null}

        <div
          className={cn(
            "mx-auto mt-10 w-full max-w-3xl rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-xl dark:bg-slate-900/80 dark:ring-white/10 sm:p-10",
          )}
        >
          <div
            className={cn(
              "divide-y divide-slate-100 dark:divide-slate-700/50",
              "[&>section]:space-y-4 [&>section]:py-12 [&>section:first-child]:pt-0 [&>section:last-child]:pb-0",
              readingProseClass,
            )}
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
