import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App.tsx";
import { fetchCurrentUser } from "./api/auth";
import { bootstrapCsrf } from "./api/client";
import { AuthScreen } from "./components/AuthScreen.tsx";
import { Toaster } from "./components/ui/Toaster.tsx";
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
    void (async () => {
      await bootstrapCsrf();
      try {
        await fetchCurrentUser();
        useAppStore.getState().setAuthenticated(true);
      } catch {
        useAppStore.getState().setAuthenticated(false);
      }
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        Laden…
      </div>
    );
  }

  return (
    <BrowserRouter>
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
      <Toaster />
    </BrowserRouter>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);
