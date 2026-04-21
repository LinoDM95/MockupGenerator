import type { ComponentType } from "react";
import { lazy, Suspense, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Compass, Link2, Layers, LogOut, MessageCircle, RefreshCw, UserCircle, Zap } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { cn } from "./lib/ui/cn";
import { Button } from "./components/ui/primitives/Button";
import { LoadingOverlay } from "./components/ui/LoadingOverlay";
import { ThemeToggle } from "./components/ui/primitives/ThemeToggle";
import { DialogHost } from "./components/shell/DialogHost";
import { AIActivityPanel } from "./components/ai/AIActivityPanel";
const WorkspaceView = lazy(() =>
  import("./components/views/WorkspaceView").then((m) => ({ default: m.WorkspaceView })),
);
const RoadmapView = lazy(() =>
  import("./components/views/RoadmapView").then((m) => ({ default: m.RoadmapView })),
);
const IntegrationsView = lazy(() =>
  import("./components/views/IntegrationsView").then((m) => ({ default: m.IntegrationsView })),
);

const MainTabFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
    Laden…
  </div>
);
import { FeedbackNotificationPoller } from "./components/feedback/FeedbackNotificationPoller";
import { AccountPage } from "./pages/AccountPage";
import { FeedbackPage } from "./pages/FeedbackPage";
import type { AppTab } from "./store/appStore";
import { useAppStore } from "./store/appStore";

const mainTabs: { id: AppTab; label: string; shortLabel: string; icon: LucideIcon }[] = [
  { id: "workspace", label: "Erstellen", shortLabel: "Erst.", icon: Layers },
  { id: "roadmap", label: "Roadmap", shortLabel: "Road.", icon: Compass },
  { id: "integrations", label: "Integrationen", shortLabel: "Int.", icon: Link2 },
];

const tabContent: Record<AppTab, ComponentType> = {
  workspace: WorkspaceView,
  roadmap: RoadmapView,
  integrations: IntegrationsView,
};

const NAV_LOCK_TITLE = "Während eines laufenden Vorgangs ist die Navigation gesperrt.";

const ACCOUNT_PATH = "/app/konto";
const FEEDBACK_PATH = "/app/feedback";

function App() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const logout = useAppStore((s) => s.logout);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setEditingSetId = useAppStore((s) => s.setEditingSetId);
  const navigationLocked = useAppStore((s) => s.navigationLocked);
  const reduceMotion = useReducedMotion();
  const location = useLocation();
  const navigate = useNavigate();
  const isAccountPage = location.pathname === ACCOUNT_PATH;
  const isFeedbackPage = location.pathname === FEEDBACK_PATH;
  const isSecondaryPage = isAccountPage || isFeedbackPage;
  const [showBatchLauncherRefresh] = useState(
    () => typeof sessionStorage !== "undefined" && sessionStorage.getItem("mockupLauncherBatch") === "1",
  );
  const [logoutBusy, setLogoutBusy] = useState(false);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const ActiveView = tabContent[activeTab];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50 font-sans text-slate-900 selection:bg-indigo-500/20">
      <LoadingOverlay
        show={logoutBusy}
        fullScreen
        className="z-[240]"
        message="Abmelden …"
      />
      <FeedbackNotificationPoller />
      <AIActivityPanel />
      <DialogHost />

      <header className="pointer-events-none sticky top-4 z-[220] px-2 sm:px-6 lg:px-8">
        <div className="pointer-events-auto mx-auto flex min-h-14 w-full min-w-0 max-w-7xl flex-wrap items-center justify-between gap-x-2 gap-y-2 rounded-full border border-white/40 bg-white/70 px-2 py-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-100/58 dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] sm:h-14 sm:flex-nowrap sm:px-6 sm:py-0">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/20">
              <Zap size={16} className="text-white" fill="currentColor" />
            </div>
            <span className="hidden text-sm font-bold tracking-tight text-slate-900 sm:block">
              Creative Engine
            </span>
          </div>

          <nav
            className="order-3 flex w-full min-w-0 basis-full items-center justify-center gap-0.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:order-none sm:w-auto sm:basis-auto sm:justify-start sm:gap-1 sm:pb-0 md:gap-2 [&::-webkit-scrollbar]:hidden"
            aria-label="Hauptnavigation"
          >
            {mainTabs.map(({ id, label, shortLabel, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={navigationLocked}
                  title={navigationLocked ? NAV_LOCK_TITLE : undefined}
                  onClick={() => {
                    if (navigationLocked) return;
                    if (location.pathname !== "/app") {
                      navigate("/app");
                    }
                    setActiveTab(id);
                    setEditingSetId(null);
                  }}
                  className={cn(
                    "relative flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold tracking-wide transition-colors sm:gap-2 sm:px-4 sm:text-sm",
                    navigationLocked
                      ? "cursor-not-allowed opacity-50"
                      : "hover:text-indigo-600 dark:hover:text-indigo-400",
                    isActive && !isSecondaryPage
                      ? "bg-indigo-50/50 text-indigo-600"
                      : "text-slate-500",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon size={16} strokeWidth={2} className="shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{shortLabel}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {showBatchLauncherRefresh ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden h-8 gap-1.5 px-2.5 text-xs sm:inline-flex"
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
                "group flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ease-out",
                navigationLocked
                  ? "cursor-not-allowed opacity-50"
                  : !reduceMotion && "hover:scale-105 active:scale-95",
                isFeedbackPage
                  ? "bg-indigo-50/50 text-indigo-600"
                  : navigationLocked
                    ? "text-slate-400"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10",
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
                "group flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ease-out",
                navigationLocked
                  ? "cursor-not-allowed opacity-50"
                  : !reduceMotion && "hover:scale-105 active:scale-95",
                isAccountPage
                  ? "bg-indigo-50/50 text-indigo-600"
                  : navigationLocked
                    ? "text-slate-400"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10",
              )}
              aria-current={isAccountPage ? "page" : undefined}
              aria-label="Konto — Profil, Daten und Sicherheit"
            >
              <UserCircle
                size={18}
                strokeWidth={2}
                className={cn(
                  "transition-transform duration-300",
                  !reduceMotion && "group-hover:rotate-6"
                )}
                aria-hidden
              />
            </button>

            <ThemeToggle size="sm" />
            
            {showBatchLauncherRefresh ? (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 ring-1 ring-slate-900/5 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:ring-white/10 dark:hover:bg-white/10 sm:hidden"
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
                navigationLocked
                  ? NAV_LOCK_TITLE
                  : logoutBusy
                    ? "Abmelden …"
                    : undefined
              }
              onClick={() => {
                if (navigationLocked || logoutBusy) return;
                setLogoutBusy(true);
                void logout().finally(() => setLogoutBusy(false));
              }}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                navigationLocked || logoutBusy
                  ? "cursor-not-allowed text-slate-400 opacity-50"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10",
              )}
            >
              <LogOut size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-0 w-full min-w-0 max-w-7xl flex-1 flex-col px-3 pb-10 pt-8 sm:px-6 sm:pb-12 sm:pt-10 lg:px-8">
        {isAccountPage ? (
          <div className="w-full min-w-0">
            <AccountPage />
          </div>
        ) : isFeedbackPage ? (
          <div className="w-full min-w-0">
            <FeedbackPage />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className="w-full min-w-0"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Suspense fallback={<MainTabFallback />}>
                <ActiveView />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

export default App;