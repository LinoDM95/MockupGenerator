import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "../../lib/ui/cn";
import { getLegalSiteConfig, legalConfigLooksIncomplete } from "../../lib/legal/config";
import { ThemeToggle } from "../ui/primitives/ThemeToggle";

type Props = {
  title: string;
  children: ReactNode;
};

const readingProseClass = cn(
  "text-sm font-medium leading-relaxed text-zinc-700",
  "[&_h2]:mt-0 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-zinc-900",
  "[&_a]:font-semibold [&_a]:text-indigo-600 [&_a]:underline [&_a]:decoration-indigo-600/30 [&_a]:underline-offset-2 hover:[&_a]:text-indigo-700 dark:[&_a]:text-indigo-400",
  "[&_strong]:text-zinc-900",
  "[&_code]:rounded-md [&_code]:bg-zinc-100/90 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-zinc-800",
);

export const LegalPageLayout = ({ title, children }: Props) => {
  const cfg = getLegalSiteConfig();
  const showDevHint = import.meta.env.DEV && legalConfigLooksIncomplete(cfg);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50 font-sans text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/85 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
            Startseite
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden text-sm font-semibold text-zinc-600 hover:text-indigo-600 dark:hover:text-indigo-400 sm:inline"
            >
              Anmelden
            </Link>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Rechtliches · {cfg.appName}
        </p>
        <h1 className="mt-3 text-center text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {title}
        </h1>

        {showDevHint ? (
          <div
            className="mx-auto mt-10 w-full max-w-3xl rounded-2xl bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-inset ring-amber-500/25 dark:ring-amber-500/30"
            role="status"
          >
            Hinweis (nur Entwicklung): Impressum-Kontaktdaten sind unvollständig — bitte{" "}
            <code className="rounded-md bg-white/80 px-1 font-mono text-xs">
              VITE_LEGAL_*
            </code>{" "}
            in{" "}
            <code className="rounded-md bg-white/80 px-1 font-mono text-xs">
              frontend/frontend/.env
            </code>{" "}
            setzen.
          </div>
        ) : null}

        <div
          className={cn(
            "mx-auto mt-10 w-full max-w-3xl rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_0_rgb(9,9,11,0.04)] dark:border-zinc-800 dark:bg-zinc-950 sm:p-10",
          )}
        >
          <div
            className={cn(
              "divide-y divide-slate-100",
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
