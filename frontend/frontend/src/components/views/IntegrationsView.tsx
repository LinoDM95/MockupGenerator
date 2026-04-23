import { Navigate, useParams } from "react-router-dom";

import { SetupHub } from "../setup/SetupHub";
import { AppPage } from "../ui/layout/AppPage";
import { AppSubNavPageLayout } from "../ui/layout/AppSubNavPageLayout";

export const IntegrationsView = () => {
  const { mode } = useParams<{ mode: string }>();

  if (mode !== "alle") {
    return <Navigate to="/app/integrationen/alle" replace />;
  }

  return (
    <AppSubNavPageLayout hideTitle title="Integrationen" description="">
      <AppPage>
        <h1 className="sr-only">Integrationen</h1>
        <SetupHub />
      </AppPage>
    </AppSubNavPageLayout>
  );
};
