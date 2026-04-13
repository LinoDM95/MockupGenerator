import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { etsyOAuthCallback } from "../api/etsy";
import { toast } from "../lib/toast";

export const EtsyCallbackPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Etsy wird verbunden…");

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      setMessage("Fehlende OAuth-Parameter.");
      toast.error("Etsy-Callback: code oder state fehlt.");
      const t = window.setTimeout(() => navigate("/", { replace: true }), 2500);
      return () => window.clearTimeout(t);
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await etsyOAuthCallback({ code, state });
        if (cancelled) return;
        if (res.partial) {
          setMessage(res.detail || "Teilweise verbunden.");
          toast.info(res.detail || "Etsy verbunden, Shop prüfen.");
        } else {
          setMessage("Verbunden. Weiterleitung…");
          toast.success("Etsy erfolgreich verknüpft.");
        }
        window.setTimeout(() => navigate("/", { replace: true }), 800);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
        setMessage(msg);
        toast.error("Etsy-Callback fehlgeschlagen.");
        window.setTimeout(() => navigate("/", { replace: true }), 2500);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, params]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-6 font-sans text-neutral-800">
      <div className="max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-lg font-semibold text-neutral-900">Etsy OAuth</h1>
        <p className="text-sm text-neutral-600">{message}</p>
      </div>
    </div>
  );
};
