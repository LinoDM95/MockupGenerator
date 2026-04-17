import { LayoutGroup } from "framer-motion";
import { LayoutGrid, Wand2 } from "lucide-react";

import { useAppStore } from "../store/appStore";
import { SetupHub } from "./setup/SetupHub";
import { IntegrationSetupWizard } from "./setup/IntegrationSetupWizard";
import { SubNavTab } from "./ui/SubNavTab";

export const IntegrationsView = () => {
  const mode = useAppStore((s) => s.integrationsPanelMode);
  const setIntegrationsPanelMode = useAppStore((s) => s.setIntegrationsPanelMode);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Integrationen</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Geführter Assistent (Gelato → Gemini → Vertex) oder alle Bereiche einzeln.
          </p>
        </div>
        <LayoutGroup>
          <nav
            className="flex w-full flex-wrap items-center justify-end gap-0.5 sm:w-auto sm:gap-1"
            aria-label="Integrationsmodus"
          >
            <SubNavTab
              label="Geführter Assistent"
              shortLabel="Assistent"
              icon={Wand2}
              active={mode === "wizard"}
              activePillLayoutId="integrations-sub-nav-pill"
              onClick={() => setIntegrationsPanelMode("wizard")}
            />
            <SubNavTab
              label="Alle Integrationen"
              shortLabel="Alle"
              icon={LayoutGrid}
              active={mode === "all"}
              activePillLayoutId="integrations-sub-nav-pill"
              onClick={() => setIntegrationsPanelMode("all")}
            />
          </nav>
        </LayoutGroup>
      </div>
      {mode === "wizard" ? <IntegrationSetupWizard /> : <SetupHub />}
    </div>
  );
};
