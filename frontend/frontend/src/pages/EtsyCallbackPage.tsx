import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { etsyOAuthCallback } from "../api/etsy";
import { toast } from "../lib/ui/toast";
import { Card } from "../components/ui/primitives/Card";

export const EtsyCallbackPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Etsy wird verbunden…");

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const savedState = sessionStorage.getItem("etsy_oauth_state");
    sessionStorage.removeItem("etsy_oauth_state");
    if (!code || !state || state !== savedState) {
      const t = window.setTimeout(() => navigate("/", { replace: true }), 2500);
      queueMicrotask(() => {
        setMessage("Ungültiger oder fehlender OAuth-State.");
        toast.error("Etsy-Callback: State ungültig oder Parameter fehlen.");
      });
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
    <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-50 p-6">
      <Card padding="lg" className="max-w-md text-center">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-indigo-600" strokeWidth={1.75} />
        <h1 className="mb-2 text-lg font-semibold text-slate-900">Etsy OAuth</h1>
        <p className="text-sm text-slate-600">{message}</p>
      </Card>
    </div>
  );
};
