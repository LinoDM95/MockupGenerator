import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Folder, Layers, Maximize, Store } from "lucide-react";

import type { WorkspaceTab } from "../store/appStore";
import { useAppStore } from "../store/appStore";
import { SubNavTab } from "./ui/SubNavTab";
import { EtsyListingsEditor } from "./etsy/EtsyListingsEditor";
import { GeneratorView } from "./GeneratorView";
import { TemplatesStudio } from "./TemplatesStudio";
import { UpscalerView } from "./upscaler/UpscalerView";

const SUB: { id: WorkspaceTab; label: string; shortLabel: string; icon: typeof Layers }[] = [
  { id: "generator", label: "Generator", shortLabel: "Gen.", icon: Layers },
  { id: "templates", label: "Vorlagen-Studio", shortLabel: "Vorl.", icon: Folder },
  { id: "upscaler", label: "Upscaler", shortLabel: "Up.", icon: Maximize },
  { id: "etsy", label: "Etsy", shortLabel: "Etsy", icon: Store },
];

export const WorkspaceView = () => {
  const workspaceTab = useAppStore((s) => s.workspaceTab);
  const setWorkspaceTab = useAppStore((s) => s.setWorkspaceTab);
  const setEditingSetId = useAppStore((s) => s.setEditingSetId);
  const reduceMotion = useReducedMotion();

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Erstellen</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Generator, Vorlagen, Upscaler und Etsy-Shop (Listings und Editor).
          </p>
        </div>
        <nav
          className="flex flex-wrap items-center justify-end gap-0.5 sm:gap-1"
          aria-label="Erstellen: Unterbereich wechseln"
        >
          {SUB.map(({ id, label, shortLabel, icon: Icon }) => (
            <SubNavTab
              key={id}
              label={label}
              shortLabel={shortLabel}
              icon={Icon}
              active={workspaceTab === id}
              onClick={() => {
                setWorkspaceTab(id);
                setEditingSetId(null);
              }}
            />
          ))}
        </nav>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={workspaceTab}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : 2 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {workspaceTab === "generator" ? <GeneratorView /> : null}
          {workspaceTab === "templates" ? <TemplatesStudio /> : null}
          {workspaceTab === "upscaler" ? <UpscalerView /> : null}
          {workspaceTab === "etsy" ? <EtsyListingsEditor /> : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
