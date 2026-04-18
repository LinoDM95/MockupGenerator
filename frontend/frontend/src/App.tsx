import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Link2, Layers, LogOut, Megaphone, RefreshCw, Rocket, Zap } from "lucide-react";
import { Navigate } from "react-router-dom";

import { clearProactiveTokenRefresh, scheduleProactiveAccessRefresh } from "./api/client";
import { cn } from "./lib/cn";
import { Button } from "./components/ui/Button";
import { DialogHost } from "./components/DialogHost";
import { AIActivityPanel } from "./components/ai/AIActivityPanel";
import { IntegrationsView } from "./components/IntegrationsView";
import { WorkspaceView } from "./components/WorkspaceView";
import { AutomationView } from "./components/automation/AutomationView";
import { MarketingDashboard } from "./components/marketing/MarketingDashboard";
import type { AppTab } from "./store/appStore";
import { useAppStore } from "./store/appStore";

const mainTabs: { id: AppTab; label: string; shortLabel: string; icon: LucideIcon }[] = [
  { id: "workspace", label: "Erstellen", shortLabel: "Erst.", icon: Layers },
  { id: "marketing", label: "Verbreiten", shortLabel: "Verbr.", icon: Megaphone },
  { id: "automation", label: "Automatisieren", shortLabel: "Autom.", icon: Rocket },
  { id: "integrations", label: "Integrationen", shortLabel: "Int.", icon: Link2 },
];

const tabContent: Record<AppTab, ComponentType> = {
  workspace: WorkspaceView,
  integrations: IntegrationsView,
  automation: AutomationView,
  marketing: MarketingDashboard,
};

const NAV_LOCK_TITLE = "Während eines laufenden Vorgangs ist die Navigation gesperrt.";

function App() {
  const accessToken = useAppStore((s) => s.accessToken);
  const logout = useAppStore((s) => s.logout);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setEditingSetId = useAppStore((s) => s.setEditingSetId);
  const navigationLocked = useAppStore((s) => s.navigationLocked);
  const reduceMotion = useReducedMotion();
  const [showBatchLauncherRefresh] = useState(
    () => typeof sessionStorage !== "undefined" && sessionStorage.getItem("mockupLauncherBatch") === "1",
  );

  useEffect(() => {
    if (!accessToken) {
      clearProactiveTokenRefresh();
      return;
    }
    scheduleProactiveAccessRefresh();
  }, [accessToken]);

  if (!accessToken) return <Navigate to="/" replace />;

  const ActiveView = tabContent[activeTab];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-500/20">
      <AIActivityPanel />
      <DialogHost />

      <header className="pointer-events-none sticky top-4 z-50 px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-auto mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full bg-white px-4 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 sm:px-6">
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 shadow-sm">
              <Zap size={16} className="text-white" fill="currentColor" />
            </div>
            <span className="hidden text-sm font-bold tracking-tight text-slate-900 sm:block">
              Mockup Generator Pro
            </span>
          </div>

          <nav
            className="flex min-w-0 items-center gap-1 sm:gap-2"
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
                    setActiveTab(id);
                    setEditingSetId(null);
                  }}
                  className={cn(
                    "relative flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors sm:px-4 sm:text-sm",
                    navigationLocked
                      ? "cursor-not-allowed opacity-50"
                      : "hover:text-indigo-600",
                    isActive ? "bg-indigo-50/50 text-indigo-600" : "text-slate-500",
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
            {showBatchLauncherRefresh ? (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 ring-1 ring-slate-900/5 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:hidden"
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
              disabled={navigationLocked}
              title={navigationLocked ? NAV_LOCK_TITLE : undefined}
              onClick={() => {
                if (navigationLocked) return;
                logout();
              }}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors",
                navigationLocked
                  ? "cursor-not-allowed opacity-50"
                  : "hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <LogOut size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <ActiveView />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
