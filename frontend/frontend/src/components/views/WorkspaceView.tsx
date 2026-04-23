import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { lazy, Suspense, useCallback, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";

import { fetchAiStatus } from "../../api/ai";
import { fetchGelatoStatus } from "../../api/gelato";
import { fetchIntegrationStatus } from "../../api/settings";
import { workspaceTabFromUrlSegment } from "../../lib/appNavigation";
import { useAppStore } from "../../store/appStore";
import { AppSubNavPageLayout } from "../ui/layout/AppSubNavPageLayout";

const GeneratorView = lazy(() =>
  import("../generator/GeneratorView").then((m) => ({ default: m.GeneratorView })),
);
const TemplatesStudio = lazy(() =>
  import("../editor/TemplatesStudio").then((m) => ({ default: m.TemplatesStudio })),
);
const UpscalerView = lazy(() =>
  import("../upscaler/UpscalerView").then((m) => ({ default: m.UpscalerView })),
);

const WorkspacePanelFallback = () => (
  <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-zinc-50/80 text-sm font-medium text-zinc-500 ring-1 ring-inset ring-zinc-900/5 dark:bg-zinc-900/40 dark:text-zinc-400">
    Laden…
  </div>
);

export const WorkspaceView = () => {
  const { tab } = useParams<{ tab: string }>();
  const setWorkspaceTab = useAppStore((s) => s.setWorkspaceTab);
  const reduceMotion = useReducedMotion();

  const wt = workspaceTabFromUrlSegment(tab ?? "");

  const warmWorkspaceCaches = useCallback(() => {
    void fetchIntegrationStatus();
    void fetchAiStatus();
    void fetchGelatoStatus();
  }, []);

  useEffect(() => {
    warmWorkspaceCaches();
  }, [warmWorkspaceCaches]);

  useEffect(() => {
    if (!wt) return;
    if (wt !== useAppStore.getState().workspaceTab) {
      setWorkspaceTab(wt);
    }
  }, [wt, setWorkspaceTab]);

  if (!wt) {
    return <Navigate to="/app/erstellen/generator" replace />;
  }

  return (
    <AppSubNavPageLayout
      hideTitle
      title="Erstellen"
      description=""
    >
      <h1 className="sr-only">Erstellen</h1>
      <AnimatePresence mode="wait">
        <motion.div
          key={wt}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : 2 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <Suspense fallback={<WorkspacePanelFallback />}>
            {wt === "generator" ? <GeneratorView /> : null}
            {wt === "templates" ? <TemplatesStudio /> : null}
            {wt === "upscaler" ? <UpscalerView /> : null}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </AppSubNavPageLayout>
  );
};
