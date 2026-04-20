import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App.tsx";
import { fetchCurrentUser } from "./api/auth";
import { bootstrapCsrf } from "./api/client";
import { AuthScreen } from "./components/AuthScreen.tsx";
import { Toaster } from "./components/ui/Toaster.tsx";
import { GlobalLegalFooter } from "./components/legal/GlobalLegalFooter.tsx";
import { AgbPage } from "./pages/AgbPage.tsx";
import { DatenschutzPage } from "./pages/DatenschutzPage.tsx";
import { EtsyCallbackPage } from "./pages/EtsyCallbackPage.tsx";
import { ImpressumPage } from "./pages/ImpressumPage.tsx";
import { PinterestCallbackPage } from "./pages/PinterestCallbackPage.tsx";
import { LandingPage } from "./pages/LandingPage.tsx";
import { useAppStore } from "./store/appStore";
import "./index.css";

/** Von StartMockupApp.bat mit ?launcher=batch – zeigt in der App den Button „Aktualisieren“ (Reload). */
if (typeof window !== "undefined") {
  const p = new URLSearchParams(window.location.search);
  if (p.get("launcher") === "batch") {
    sessionStorage.setItem("mockupLauncherBatch", "1");
  }
}

const AppShell = () => {
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
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {!ready ? (
          <div className="flex min-h-0 flex-1 items-center justify-center text-sm font-medium text-slate-500 dark:text-slate-400">
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
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);
