import { useReducedMotion } from "framer-motion";
import { ChevronRight, LogOut, Menu, MessageCircle, RefreshCw, UserCircle } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { CurrentUser } from "../../api/auth";
import { ACCOUNT_PATH, FEEDBACK_PATH } from "../../lib/appNavigation";
import { cn } from "../../lib/ui/cn";
import { useAppStore } from "../../store/appStore";
import { Button } from "../ui/primitives/Button";
import { ThemeToggle } from "../ui/primitives/ThemeToggle";
import { LoadingOverlay } from "../ui/LoadingOverlay";

const NAV_LOCK_TITLE =
  "Während eines laufenden Vorgangs ist die Navigation gesperrt. Bitte warten oder Vorgang abbrechen.";

const breadcrumbForPath = (pathname: string): { area: string; label: string } => {
  if (pathname === ACCOUNT_PATH) {
    return { area: "Konto", label: "Profil & Sicherheit" };
  }
  if (pathname === FEEDBACK_PATH) {
    return { area: "Konto", label: "Feedback" };
  }
  if (pathname.startsWith("/app/erstellen/")) {
    const seg = pathname.split("/")[3] ?? "";
    const labels: Record<string, string> = {
      generator: "Generator",
      vorlagen: "Vorlagen-Studio",
      upscaler: "Upscaler",
    };
    return { area: "Erstellen", label: labels[seg] ?? "Erstellen" };
  }
  if (pathname.startsWith("/app/publizieren/")) {
    const seg = pathname.split("/")[3] ?? "";
    const labels: Record<string, string> = {
      etsy: "Etsy-Listings",
      marketing: "Verbreiten",
      automation: "Automatisieren",
    };
    return { area: "Publizieren", label: labels[seg] ?? "Publizieren" };
  }
  if (pathname.startsWith("/app/integrationen")) {
    return { area: "Konto", label: "Integrationen" };
  }
  return { area: "PrintFlow", label: "App" };
};

type Props = {
  user: CurrentUser | null;
  onOpenMobileSidebar: () => void;
  /** Desktop: Sidebar schmal — Lasche ragt in die Topbar; extra linkes Padding ab md. */
  sidebarCollapsedDesktop: boolean;
};

export const AppTopbar = ({ user, onOpenMobileSidebar, sidebarCollapsedDesktop }: Props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationLocked = useAppStore((s) => s.navigationLocked);
  const logout = useAppStore((s) => s.logout);
  const reduceMotion = useReducedMotion();
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [showBatchLauncherRefresh] = useState(
    () => typeof sessionStorage !== "undefined" && sessionStorage.getItem("mockupLauncherBatch") === "1",
  );

  const isAccountPage = location.pathname === ACCOUNT_PATH;
  const isFeedbackPage = location.pathname === FEEDBACK_PATH;
  const { area, label } = breadcrumbForPath(location.pathname);

  return (
    <>
      <LoadingOverlay
        show={logoutBusy}
        fullScreen
        className="z-[240]"
        message="Abmelden …"
      />
      <header
        className={cn(
          "flex h-[52px] shrink-0 items-center gap-3 border-b border-[color:var(--pf-border)] bg-[color:var(--pf-bg)] px-6",
          sidebarCollapsedDesktop && "md:pl-10",
        )}
      >
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-900"
          aria-label="Menü öffnen"
          onClick={onOpenMobileSidebar}
        >
          <Menu size={18} strokeWidth={2} />
        </button>

        <div className="flex min-w-0 items-center gap-2 text-[13px]">
          <span className="shrink-0 text-[color:var(--pf-fg-subtle)]">{area}</span>
          <ChevronRight size={12} className="shrink-0 text-[color:var(--pf-fg-faint)]" aria-hidden />
          <span className="min-w-0 truncate font-semibold text-[color:var(--pf-fg)]">
            {label}
          </span>
          {user ? (
            <span className="hidden text-zinc-400 lg:inline dark:text-zinc-500">
              · {user.username}
            </span>
          ) : null}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {showBatchLauncherRefresh ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden h-8 gap-1.5 px-2.5 text-xs lg:inline-flex"
              title="Seite neu laden (z. B. nach Code-Änderungen)"
              onClick={() => {
                window.location.reload();
              }}
            >
              <RefreshCw size={14} strokeWidth={2} className="shrink-0" />
              Aktualisieren
            </Button>
          ) : null}

          <button
            type="button"
            disabled={navigationLocked}
            title={navigationLocked ? NAV_LOCK_TITLE : "Feedback an das Team"}
            onClick={() => {
              if (navigationLocked) return;
              navigate(FEEDBACK_PATH);
            }}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
              navigationLocked
                ? "cursor-not-allowed opacity-50"
                : !reduceMotion && "active:scale-95",
              isFeedbackPage
                ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"
                : navigationLocked
                  ? "text-zinc-400"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900",
            )}
            aria-current={isFeedbackPage ? "page" : undefined}
            aria-label="Feedback an das Team"
          >
            <MessageCircle size={18} strokeWidth={2} className="shrink-0" aria-hidden />
          </button>

          <button
            type="button"
            disabled={navigationLocked}
            title={navigationLocked ? NAV_LOCK_TITLE : "Konto — Profil, Daten und Sicherheit"}
            onClick={() => {
              if (navigationLocked) return;
              navigate(ACCOUNT_PATH);
            }}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
              navigationLocked
                ? "cursor-not-allowed opacity-50"
                : !reduceMotion && "active:scale-95",
              isAccountPage
                ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"
                : navigationLocked
                  ? "text-zinc-400"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900",
            )}
            aria-current={isAccountPage ? "page" : undefined}
            aria-label="Konto — Profil, Daten und Sicherheit"
          >
            <UserCircle size={18} strokeWidth={2} aria-hidden />
          </button>

          <ThemeToggle size="sm" />

          {showBatchLauncherRefresh ? (
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 lg:hidden dark:hover:bg-zinc-900"
              title="Seite neu laden"
              aria-label="Aktualisieren"
              onClick={() => {
                window.location.reload();
              }}
            >
              <RefreshCw size={16} strokeWidth={2} />
            </button>
          ) : null}

          <button
            type="button"
            disabled={navigationLocked || logoutBusy}
            title={
              navigationLocked ? NAV_LOCK_TITLE : logoutBusy ? "Abmelden …" : "Abmelden"
            }
            onClick={() => {
              if (navigationLocked || logoutBusy) return;
              setLogoutBusy(true);
              void logout().finally(() => setLogoutBusy(false));
            }}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
              navigationLocked || logoutBusy
                ? "cursor-not-allowed text-zinc-400 opacity-50"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900",
            )}
            aria-label="Abmelden"
          >
            <LogOut size={16} strokeWidth={2} />
          </button>
        </div>
      </header>
    </>
  );
};
