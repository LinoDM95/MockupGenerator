import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App.tsx";
import { Toaster } from "./components/ui/Toaster.tsx";
import { EtsyCallbackPage } from "./pages/EtsyCallbackPage.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/etsy/callback" element={<EtsyCallbackPage />} />
        <Route path="/*" element={<App />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  </StrictMode>,
);
