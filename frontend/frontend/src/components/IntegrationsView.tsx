import { LayoutGrid, Wand2 } from "lucide-react";

import { useAppStore } from "../store/appStore";
import { SetupHub } from "./setup/SetupHub";
import { IntegrationSetupWizard } from "./setup/IntegrationSetupWizard";
import { AppSubNavPageLayout } from "./ui/AppSubNavPageLayout";
import { SubNavTab } from "./ui/SubNavTab";

export const IntegrationsView = () => {
  const mode = useAppStore((s) => s.integrationsPanelMode);
  const setIntegrationsPanelMode = useAppStore((s) => s.setIntegrationsPanelMode);

  return (
    <AppSubNavPageLayout
      title="Integrationen"
      description="Geführter Assistent (Gelato → Gemini → Vertex) oder alle Bereiche einzeln."
      subNavAriaLabel="Integrationen: Modus wechseln"
      subNav={
        <>
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
        </>
      }
    >
      {mode === "wizard" ? <IntegrationSetupWizard /> : <SetupHub />}
    </AppSubNavPageLayout>
  );
};
