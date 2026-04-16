import type { ComponentType } from "react";
import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Link2, Layers, LogOut, Megaphone, Rocket } from "lucide-react";
import { Navigate } from "react-router-dom";

import {
  clearProactiveTokenRefresh,
  scheduleProactiveAccessRefresh,
} from "./api/client";
import { cn } from "./lib/cn";
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

function App() {
  const accessToken = useAppStore((s) => s.accessToken);
  const logout = useAppStore((s) => s.logout);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setEditingSetId = useAppStore((s) => s.setEditingSetId);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!accessToken) {
      clearProactiveTokenRefresh();
      return;
    }
    scheduleProactiveAccessRefresh();
  }, [accessToken]);

  if (!accessToken) {
    return <Navigate to="/" replace />;
  }

  const ActiveView = tabContent[activeTab];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/30">
      <AIActivityPanel />
      <DialogHost />

      <header className="sticky top-0 z-50 border-b border-slate-200/85 bg-white/90 shadow-[0_1px_0_0_rgba(99,102,241,0.07)] backdrop-blur-lg ring-1 ring-indigo-500/5">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
          <span className="min-w-0 shrink truncate text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
            Mockup Generator Pro
          </span>

          <nav
            className="flex min-w-0 flex-1 items-center justify-center gap-0.5 sm:gap-1"
            aria-label="Hauptnavigation"
          >
            {mainTabs.map(({ id, label, shortLabel, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  setEditingSetId(null);
                }}
                className={cn(
                  "relative flex min-w-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200 sm:gap-2 sm:px-4 sm:text-sm",
                  activeTab === id
                    ? "text-indigo-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                )}
                aria-current={activeTab === id ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={1.75} className="shrink-0" />
                <span className="hidden min-w-0 truncate sm:inline">{label}</span>
                <span className="truncate sm:hidden">{shortLabel}</span>
                {activeTab === id && (
                  <span className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-indigo-600 sm:left-3 sm:right-3" />
                )}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => logout()}
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-xs text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-800 sm:gap-1.5 sm:px-3 sm:text-sm"
          >
            <LogOut size={15} strokeWidth={1.75} className="sm:size-4" />
            <span className="hidden sm:inline">Abmelden</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <ActiveView />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
