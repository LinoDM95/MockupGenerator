import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App.tsx";
import { fetchCurrentUser } from "./api/auth";
import { bootstrapCsrf } from "./api/client";
import { AuthScreen } from "./components/auth/AuthScreen.tsx";
import { Toaster } from "./components/ui/overlay/Toaster.tsx";
import { GlobalLegalFooter } from "./components/legal/GlobalLegalFooter.tsx";
import { AgbPage } from "./pages/AgbPage.tsx";
import { DatenschutzPage } from "./pages/DatenschutzPage.tsx";
import { EtsyCallbackPage } from "./pages/EtsyCallbackPage.tsx";
import { ImpressumPage } from "./pages/ImpressumPage.tsx";
import { PinterestCallbackPage } from "./pages/PinterestCallbackPage.tsx";
import { LandingPage } from "./pages/LandingPage.tsx";
import { ColorSchemeProvider } from "./hooks/ColorSchemeProvider";
import { useAppStore } from "./store/appStore";

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
        <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
          {!ready ? (
            <div className="flex min-h-0 flex-1 items-center justify-center text-sm font-medium text-slate-500">
              Laden…
            </div>
          ) : (
            <div className="min-h-0 flex-1">
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
            </div>
          )}
          <GlobalLegalFooter />
        </div>
        <Toaster />
      </BrowserRouter>
    </ColorSchemeProvider>
  );
};
