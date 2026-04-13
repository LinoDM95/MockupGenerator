import { Folder, Layers, Store, Zap } from "lucide-react";

import { AuthScreen } from "./components/AuthScreen";
import { DialogHost } from "./components/DialogHost";
import { EtsyWorkspace } from "./components/etsy/EtsyWorkspace";
import { GeneratorView } from "./components/GeneratorView";
import { TemplatesStudio } from "./components/TemplatesStudio";
import { useAppStore } from "./store/appStore";

function App() {
  const accessToken = useAppStore((s) => s.accessToken);
  const logout = useAppStore((s) => s.logout);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setEditingSetId = useAppStore((s) => s.setEditingSetId);

  if (!accessToken) {
    return (
      <>
        <AuthScreen />
        <DialogHost />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 p-4 font-sans text-neutral-800 md:p-8">
      <DialogHost />
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-center md:text-left">
            <h1 className="flex items-center justify-center gap-2 text-3xl font-bold tracking-tight text-neutral-900 md:justify-start">
              <Zap className="text-amber-500" size={32} /> Etsy Mockup Generator Pro
            </h1>
            <p className="text-sm text-neutral-500">Wall-Art Mockups – Vorlagen & Batch-ZIP</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl bg-neutral-200 p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("generator");
                  setEditingSetId(null);
                }}
                className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
                  activeTab === "generator" ? "bg-white text-blue-700 shadow-sm" : "text-neutral-600"
                }`}
              >
                <Layers size={18} /> Generator
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("templates");
                  setEditingSetId(null);
                }}
                className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
                  activeTab === "templates" ? "bg-white text-blue-700 shadow-sm" : "text-neutral-600"
                }`}
              >
                <Folder size={18} /> Vorlagen-Studio
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("etsy");
                  setEditingSetId(null);
                }}
                className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
                  activeTab === "etsy" ? "bg-white text-blue-700 shadow-sm" : "text-neutral-600"
                }`}
              >
                <Store size={18} /> Etsy
              </button>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-white"
            >
              Abmelden
            </button>
          </div>
        </header>

        {activeTab === "generator" ? (
          <GeneratorView />
        ) : activeTab === "templates" ? (
          <TemplatesStudio />
        ) : (
          <EtsyWorkspace />
        )}
      </div>
    </div>
  );
}

export default App;
