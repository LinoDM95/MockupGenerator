import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, useParams } from "react-router-dom";

import { publishTabFromUrlSegment } from "../../lib/appNavigation";

const EtsyListingsEditor = lazy(() =>
  import("../etsy/EtsyListingsEditor").then((m) => ({ default: m.EtsyListingsEditor })),
);
const MarketingDashboard = lazy(() =>
  import("../marketing/MarketingDashboard").then((m) => ({ default: m.MarketingDashboard })),
);
const AutomationView = lazy(() =>
  import("../automation/AutomationView").then((m) => ({ default: m.AutomationView })),
);

const Fallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
    Laden…
  </div>
);

export const PublishRouteOutlet = () => {
  const { publishTab } = useParams<{ publishTab: string }>();
  const pt = publishTabFromUrlSegment(publishTab ?? "");

  if (!pt) {
    return <Navigate to="/app/publizieren/etsy" replace />;
  }

  let body: ReactNode = null;
  if (pt === "etsy") body = <EtsyListingsEditor />;
  if (pt === "marketing") body = <MarketingDashboard />;
  if (pt === "automation") body = <AutomationView />;

  return <Suspense fallback={<Fallback />}>{body}</Suspense>;
};
