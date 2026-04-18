import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App.tsx";
import { AuthScreen } from "./components/AuthScreen.tsx";
import { Toaster } from "./components/ui/Toaster.tsx";
import { EtsyCallbackPage } from "./pages/EtsyCallbackPage.tsx";
import { PinterestCallbackPage } from "./pages/PinterestCallbackPage.tsx";
import { LandingPage } from "./pages/LandingPage.tsx";
import "./index.css";

/** Von StartMockupApp.bat mit ?launcher=batch – zeigt in der App den Button „Aktualisieren“ (Reload). */
if (typeof window !== "undefined") {
  const p = new URLSearchParams(window.location.search);
  if (p.get("launcher") === "batch") {
    sessionStorage.setItem("mockupLauncherBatch", "1");
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthScreen />} />
        <Route path="/etsy/callback" element={<EtsyCallbackPage />} />
        <Route path="/pinterest/callback" element={<PinterestCallbackPage />} />
        <Route path="/*" element={<App />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  </StrictMode>,
);
