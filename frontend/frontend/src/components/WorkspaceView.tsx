import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Folder, Layers, Maximize } from "lucide-react";
import { lazy, Suspense } from "react";

import type { WorkspaceTab } from "../store/appStore";
import { useAppStore } from "../store/appStore";
import { AppSubNavPageLayout } from "./ui/AppSubNavPageLayout";
import { SubNavTab } from "./ui/SubNavTab";

const GeneratorView = lazy(() =>
  import("./GeneratorView").then((m) => ({ default: m.GeneratorView })),
);
const TemplatesStudio = lazy(() =>
  import("./TemplatesStudio").then((m) => ({ default: m.TemplatesStudio })),
);
const UpscalerView = lazy(() =>
  import("./upscaler/UpscalerView").then((m) => ({ default: m.UpscalerView })),
);

const WorkspacePanelFallback = () => (
  <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-slate-50/80 text-sm font-medium text-slate-500 ring-1 ring-inset ring-slate-900/5">
    Laden…
  </div>
);

const NAV_LOCK_TITLE =
  "Während eines laufenden Vorgangs ist die Navigation gesperrt. Bitte warten oder Vorgang abbrechen.";

const SUB: { id: WorkspaceTab; label: string; shortLabel: string; icon: typeof Layers }[] = [
  { id: "generator", label: "Generator", shortLabel: "Gen.", icon: Layers },
  { id: "templates", label: "Vorlagen-Studio", shortLabel: "Vorl.", icon: Folder },
  { id: "upscaler", label: "Upscaler", shortLabel: "Up.", icon: Maximize },
];

export const WorkspaceView = () => {
  const workspaceTab = useAppStore((s) => s.workspaceTab);
  const setWorkspaceTab = useAppStore((s) => s.setWorkspaceTab);
  const setEditingSetId = useAppStore((s) => s.setEditingSetId);
  const navigationLocked = useAppStore((s) => s.navigationLocked);
  const reduceMotion = useReducedMotion();

  return (
    <AppSubNavPageLayout
      title="Erstellen"
      description="Generator, Vorlagen-Studio und Upscaler — Mockups erstellen und exportieren."
      subNavAriaLabel="Erstellen: Unterbereich wechseln"
      subNav={
        <>
          {SUB.map(({ id, label, shortLabel, icon: Icon }) => (
            <SubNavTab
              key={id}
              label={label}
              shortLabel={shortLabel}
              icon={Icon}
              active={workspaceTab === id}
              disabled={navigationLocked}
              title={navigationLocked ? NAV_LOCK_TITLE : undefined}
              activePillLayoutId="workspace-sub-nav-pill"
              onClick={() => {
                if (navigationLocked) return;
                setWorkspaceTab(id);
                setEditingSetId(null);
              }}
            />
          ))}
        </>
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={workspaceTab}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : 2 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <Suspense fallback={<WorkspacePanelFallback />}>
            {workspaceTab === "generator" ? <GeneratorView /> : null}
            {workspaceTab === "templates" ? <TemplatesStudio /> : null}
            {workspaceTab === "upscaler" ? <UpscalerView /> : null}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </AppSubNavPageLayout>
  );
};
