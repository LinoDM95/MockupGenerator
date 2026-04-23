import { LayoutGrid, Wand2 } from "lucide-react";
import { useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { integrationsModeFromUrlSegment, integrationsUrlSegmentFromMode } from "../../lib/appNavigation";
import { useAppStore } from "../../store/appStore";
import { SetupHub } from "../setup/SetupHub";
import { IntegrationSetupWizard } from "../setup/IntegrationSetupWizard";
import { AppPage } from "../ui/layout/AppPage";
import { AppSubNavPageLayout } from "../ui/layout/AppSubNavPageLayout";
import { SubNavTab } from "../ui/layout/SubNavTab";

const NAV_LOCK_TITLE =
  "Während eines laufenden Vorgangs ist die Navigation gesperrt. Bitte warten oder Vorgang abbrechen.";

export const IntegrationsView = () => {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const navigationLocked = useAppStore((s) => s.navigationLocked);
  const integrationsPanelMode = useAppStore((s) => s.integrationsPanelMode);
  const setIntegrationsPanelMode = useAppStore((s) => s.setIntegrationsPanelMode);

  if (mode !== "assistent" && mode !== "alle") {
    return <Navigate to="/app/integrationen/assistent" replace />;
  }

  useEffect(() => {
    const m = integrationsModeFromUrlSegment(mode);
    const cur = useAppStore.getState().integrationsPanelMode;
    if (m !== cur) {
      setIntegrationsPanelMode(m);
    }
  }, [mode, setIntegrationsPanelMode]);

  return (
    <AppSubNavPageLayout
      hideTitle
      title="Integrationen"
      description=""
      subNavAriaLabel="Integrationen: Modus wechseln"
      subNav={
        <>
          <SubNavTab
            label="Geführter Assistent"
            shortLabel="Assistent"
            icon={Wand2}
            active={integrationsPanelMode === "wizard"}
            activePillLayoutId="integrations-sub-nav-pill"
            disabled={navigationLocked}
            title={navigationLocked ? NAV_LOCK_TITLE : undefined}
            onClick={() => {
              if (navigationLocked) return;
              navigate(`/app/integrationen/${integrationsUrlSegmentFromMode("wizard")}`);
            }}
          />
          <SubNavTab
            label="Alle Integrationen"
            shortLabel="Alle"
            icon={LayoutGrid}
            active={integrationsPanelMode === "all"}
            activePillLayoutId="integrations-sub-nav-pill"
            disabled={navigationLocked}
            title={navigationLocked ? NAV_LOCK_TITLE : undefined}
            onClick={() => {
              if (navigationLocked) return;
              navigate(`/app/integrationen/${integrationsUrlSegmentFromMode("all")}`);
            }}
          />
        </>
      }
    >
      <AppPage>
        <h1 className="sr-only">Integrationen</h1>
        {integrationsPanelMode === "wizard" ? <IntegrationSetupWizard /> : <SetupHub />}
      </AppPage>
    </AppSubNavPageLayout>
  );
};
