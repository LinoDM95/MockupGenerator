import type { ComponentType } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Folder,
  Globe,
  Layers,
  LogOut,
  Maximize,
  Rocket,
  Sparkles,
  Store,
} from "lucide-react";
import { Navigate } from "react-router-dom";

import { cn } from "./lib/cn";
import { DialogHost } from "./components/DialogHost";
import { AIActivityPanel } from "./components/ai/AIActivityPanel";
import { AISetup } from "./components/ai/AISetup";
import { EtsyWorkspace } from "./components/etsy/EtsyWorkspace";
import { GelatoSetup } from "./components/gelato/GelatoSetup";
import { GeneratorView } from "./components/GeneratorView";
import { TemplatesStudio } from "./components/TemplatesStudio";
import { AutomationView } from "./components/automation/AutomationView";
import { UpscalerView } from "./components/upscaler/UpscalerView";
import type { AppTab } from "./store/appStore";
import { useAppStore } from "./store/appStore";

const tabs: { id: AppTab; label: string; icon: LucideIcon }[] = [
  { id: "generator", label: "Generator", icon: Layers },
  { id: "templates", label: "Vorlagen-Studio", icon: Folder },
  { id: "etsy", label: "Etsy", icon: Store },
  { id: "gelato", label: "Gelato", icon: Globe },
  { id: "ai", label: "KI", icon: Sparkles },
  { id: "upscaler", label: "Upscaler", icon: Maximize },
  { id: "automation", label: "Automation", icon: Rocket },
];

const tabContent: Record<AppTab, ComponentType> = {
  generator: GeneratorView,
  templates: TemplatesStudio,
  etsy: EtsyWorkspace,
  gelato: GelatoSetup,
  ai: AISetup,
  upscaler: UpscalerView,
  automation: AutomationView,
};

function App() {
  const accessToken = useAppStore((s) => s.accessToken);
  const logout = useAppStore((s) => s.logout);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setEditingSetId = useAppStore((s) => s.setEditingSetId);
  const reduceMotion = useReducedMotion();

  if (!accessToken) {
    return <Navigate to="/" replace />;
  }

  const ActiveView = tabContent[activeTab];

  return (
    <div className="min-h-screen bg-slate-50">
      <AIActivityPanel />
      <DialogHost />

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="text-base font-semibold tracking-tight text-slate-900">
            Mockup Generator Pro
          </span>

          <nav className="flex items-center gap-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  setEditingSetId(null);
                }}
                className={cn(
                  "relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                  activeTab === id
                    ? "text-indigo-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                )}
              >
                <Icon size={18} strokeWidth={1.75} />
                <span className="hidden sm:inline">{label}</span>
                {activeTab === id && (
                  <span className="absolute -bottom-[calc(0.5rem+1px)] left-0 right-0 h-0.5 rounded-full bg-indigo-600" />
                )}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => logout()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-800"
          >
            <LogOut size={16} strokeWidth={1.75} />
            <span className="hidden sm:inline">Abmelden</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
