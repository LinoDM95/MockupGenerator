import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { ApiError } from "../api/client";
import { marketingOAuthCallback } from "../api/marketing";
import { toast } from "../lib/toast";

export const PinterestCallbackPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Pinterest wird verbunden…");

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      setMessage("Fehlende OAuth-Parameter.");
      toast.error("Pinterest-Callback: code oder state fehlt.");
      const t = window.setTimeout(() => navigate("/", { replace: true }), 2500);
      return () => window.clearTimeout(t);
    }
    let cancelled = false;
    void (async () => {
      try {
        await marketingOAuthCallback({ code, state });
        if (cancelled) return;
        setMessage("Verbunden. Weiterleitung…");
        toast.success("Pinterest erfolgreich verknüpft.");
        window.setTimeout(() => navigate("/", { replace: true }), 800);
      } catch (e) {
        if (cancelled) return;
        const msg =
          e instanceof ApiError ? e.getDetail() : e instanceof Error ? e.message : "Unbekannter Fehler";
        setMessage(msg);
        toast.error("Pinterest-Callback fehlgeschlagen.");
        window.setTimeout(() => navigate("/", { replace: true }), 2500);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, params]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Loader2
          className="mx-auto mb-4 h-8 w-8 animate-spin text-rose-600"
          strokeWidth={1.75}
        />
        <h1 className="mb-2 text-lg font-semibold text-slate-900">Pinterest OAuth</h1>
        <p className="text-sm text-slate-600">{message}</p>
      </div>
    </div>
  );
};
