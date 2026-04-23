import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { fetchCurrentUser } from "./api/auth";
import { bootstrapCsrf } from "./api/client";
import { PublishRouteOutlet } from "./components/shell/PublishRouteOutlet";
import { prefetchAuthenticatedSession } from "./lib/sessionPrefetch";
import { Toaster } from "./components/ui/overlay/Toaster.tsx";
import { GlobalLegalFooter } from "./components/legal/GlobalLegalFooter.tsx";
import { ColorSchemeProvider } from "./hooks/ColorSchemeProvider";
import { useAppStore } from "./store/appStore";

const AuthenticatedApp = lazy(() => import("./components/shell/AuthenticatedApp.tsx"));
const WorkspaceView = lazy(() =>
  import("./components/views/WorkspaceView").then((m) => ({ default: m.WorkspaceView })),
);
const RoadmapView = lazy(() =>
  import("./components/views/RoadmapView").then((m) => ({ default: m.RoadmapView })),
);
const IntegrationsView = lazy(() =>
  import("./components/views/IntegrationsView").then((m) => ({ default: m.IntegrationsView })),
);
const AuthScreen = lazy(() =>
  import("./components/auth/AuthScreen.tsx").then((m) => ({ default: m.AuthScreen })),
);
const AgbPage = lazy(() => import("./pages/AgbPage.tsx").then((m) => ({ default: m.AgbPage })));
const DatenschutzPage = lazy(() =>
  import("./pages/DatenschutzPage.tsx").then((m) => ({ default: m.DatenschutzPage })),
);
const EtsyCallbackPage = lazy(() =>
  import("./pages/EtsyCallbackPage.tsx").then((m) => ({ default: m.EtsyCallbackPage })),
);
const ImpressumPage = lazy(() =>
  import("./pages/ImpressumPage.tsx").then((m) => ({ default: m.ImpressumPage })),
);
const PinterestCallbackPage = lazy(() =>
  import("./pages/PinterestCallbackPage.tsx").then((m) => ({ default: m.PinterestCallbackPage })),
);
const LandingPage = lazy(() =>
  import("./pages/LandingPage.tsx").then((m) => ({ default: m.LandingPage })),
);
const AccountPage = lazy(() =>
  import("./pages/AccountPage.tsx").then((m) => ({ default: m.AccountPage })),
);
const FeedbackPage = lazy(() =>
  import("./pages/FeedbackPage.tsx").then((m) => ({ default: m.FeedbackPage })),
);

const ShellRouteFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center text-sm font-medium text-zinc-500">
    Laden…
  </div>
);

export const AppShell = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await bootstrapCsrf();
        try {
          await fetchCurrentUser();
          useAppStore.getState().setAuthenticated(true);
          void prefetchAuthenticatedSession();
        } catch {
          useAppStore.getState().setAuthenticated(false);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ColorSchemeProvider>
      <BrowserRouter>
        <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
          {!ready ? (
            <div className="flex min-h-0 flex-1 items-center justify-center text-sm font-medium text-zinc-500">
              Laden…
            </div>
          ) : (
            <div className="min-h-0 flex-1">
              <Suspense fallback={<ShellRouteFallback />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/impressum" element={<ImpressumPage />} />
                  <Route path="/datenschutz" element={<DatenschutzPage />} />
                  <Route path="/agb" element={<AgbPage />} />
                  <Route path="/login" element={<AuthScreen />} />
                  <Route path="/etsy/callback" element={<EtsyCallbackPage />} />
                  <Route path="/pinterest/callback" element={<PinterestCallbackPage />} />
                  <Route path="/app" element={<AuthenticatedApp />}>
                    <Route index element={<Navigate to="erstellen/generator" replace />} />
                    <Route path="erstellen/:tab" element={<WorkspaceView />} />
                    <Route path="roadmap" element={<RoadmapView />} />
                    <Route
                      path="publizieren"
                      element={<Navigate to="/app/publizieren/etsy" replace />}
                    />
                    <Route path="publizieren/:publishTab" element={<PublishRouteOutlet />} />
                    <Route
                      path="integrationen"
                      element={<Navigate to="/app/integrationen/assistent" replace />}
                    />
                    <Route path="integrationen/:mode" element={<IntegrationsView />} />
                    <Route path="konto" element={<AccountPage />} />
                    <Route path="feedback" element={<FeedbackPage />} />
                    <Route
                      path="*"
                      element={<Navigate to="/app/erstellen/generator" replace />}
                    />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </div>
          )}
          <GlobalLegalFooter />
        </div>
        <Toaster />
      </BrowserRouter>
    </ColorSchemeProvider>
  );
};
