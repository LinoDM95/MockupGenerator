import "@fontsource-variable/inter";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppShell } from "./AppShell.tsx";
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
    <AppShell />
  </StrictMode>,
);
