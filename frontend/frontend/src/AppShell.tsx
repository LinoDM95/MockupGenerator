import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { fetchCurrentUser } from "./api/auth";
import { bootstrapCsrf } from "./api/client";
import { MOCKUP_AUTH_DISABLED } from "./lib/devFlags";
import { prefetchAuthenticatedSession } from "./lib/sessionPrefetch";
import { Toaster } from "./components/ui/overlay/Toaster.tsx";
import { GlobalLegalFooter } from "./components/legal/GlobalLegalFooter.tsx";
import { ColorSchemeProvider } from "./hooks/ColorSchemeProvider";
import { useAppStore } from "./store/appStore";

const App = lazy(() => import("./App.tsx"));
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

const ShellRouteFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center text-sm font-medium text-slate-500">
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
        if (MOCKUP_AUTH_DISABLED) {
          useAppStore.getState().setAuthenticated(true);
          try {
            await fetchCurrentUser();
          } catch {
            /* Offener Modus: UI bleibt nutzbar auch wenn /api/auth/me/ fehlt */
          }
          void prefetchAuthenticatedSession();
        } else {
          // try { await fetchCurrentUser(); set true } catch { set false }
          try {
            await fetchCurrentUser();
            useAppStore.getState().setAuthenticated(true);
            void prefetchAuthenticatedSession();
          } catch {
            useAppStore.getState().setAuthenticated(false);
          }
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
        <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
          {!ready ? (
            <div className="flex min-h-0 flex-1 items-center justify-center text-sm font-medium text-slate-500">
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
                  <Route path="/*" element={<App />} />
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
