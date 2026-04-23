import { Link2, LogOut, Megaphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  marketingConnectionStatus,
  marketingOAuthDisconnect,
  marketingOAuthStart,
} from "../../api/marketing";
import { useIntegrationFlags } from "../../hooks/useIntegrationFlags";
import { getErrorMessage } from "../../lib/common/error";
import { toast } from "../../lib/ui/toast";
import { useAppStore } from "../../store/appStore";
import { Button } from "../ui/primitives/Button";
import { IntegrationMissingCallout } from "../ui/patterns/IntegrationMissingCallout";

/**
 * Pinterest OAuth im zentralen Integrations-Setup.
 * Veröffentlichungs-UI: vorerst aus der Hauptnavigation — siehe Roadmap.
 */
export const MarketingIntegrationSetup = () => {
  const goToRoadmap = useAppStore((s) => s.goToRoadmap);
  const { pinterest: pinterestOk, loading: flagsLoading } = useIntegrationFlags();
  const [connected, setConnected] = useState<boolean | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const s = await marketingConnectionStatus();
      setConnected(s.connected);
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void loadStatus(), 0);
    return () => window.clearTimeout(id);
  }, [loadStatus]);

  const handleConnect = useCallback(async () => {
    try {
      const { authorization_url: url, state } = await marketingOAuthStart();
      if (state) sessionStorage.setItem("pinterest_oauth_state", state);
      window.location.href = url;
    } catch (e) {
      toast.error(`OAuth-Start fehlgeschlagen: ${getErrorMessage(e)}`);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    try {
      await marketingOAuthDisconnect();
      setConnected(false);
      toast.success("Pinterest getrennt.");
    } catch {
      toast.error("Trennen fehlgeschlagen.");
    }
  }, []);

  const showPinterestMissing = !flagsLoading && !pinterestOk;

  return (
    <div className="space-y-6">
      {showPinterestMissing ? (
        <IntegrationMissingCallout
          title="Pinterest ist nicht verbunden"
          description="Ohne OAuth-Verbindung kann die App keine Boards laden und keine Pins veröffentlichen. Verknüpfe dein Konto über den Button unten."
          actionLabel="Pinterest verknüpfen"
          onSetup={() => void handleConnect()}
        />
      ) : null}

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-500/20">
            <Megaphone size={20} strokeWidth={1.75} aria-hidden />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-slate-900">
              {connected === true ? "Pinterest – Einstellungen" : "Pinterest verbinden"}
            </h3>
            {connected === true ? (
              <p className="mt-1 max-w-xl text-sm font-medium leading-relaxed text-slate-500">
                Konto-Verbindung verwalten. Boards und Pins für die Veröffentlichung sind vorgemerkt —
                die Oberfläche dazu folgt (siehe Roadmap).
              </p>
            ) : (
              <p className="mt-1 max-w-xl text-sm font-medium leading-relaxed text-slate-500">
                Verknüpfe dein Pinterest-Konto per OAuth (App-ID und Redirect-URI in der
                Pinterest Developer Console wie in der{" "}
                <code className="text-xs">.env</code> hinterlegt). Danach stehen Boards für die
                Veröffentlichung bereit — die zugehörige Oberfläche wird überarbeitet (siehe Roadmap).
              </p>
            )}
            {connected === true ? (
              <p className="mt-2 text-sm font-semibold text-emerald-700">Status: verbunden</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void handleConnect()}
            className="gap-2 bg-rose-600 text-white hover:bg-rose-700"
          >
            <Link2 size={16} strokeWidth={1.75} aria-hidden />
            Pinterest verknüpfen
          </Button>
          <Button variant="outline" type="button" onClick={() => void handleDisconnect()}>
            <LogOut size={16} strokeWidth={1.75} aria-hidden /> Trennen
          </Button>
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-900/5">
        <p className="text-sm font-medium text-slate-600">
          Zu{" "}
          <span className="font-bold text-slate-900">Pins und Veröffentlichungs-Warteschlange</span>{" "}
          findest du den geplanten Ausbau unter{" "}
          <button
            type="button"
            className="text-indigo-600 hover:text-indigo-800 hover:underline"
            onClick={() => goToRoadmap()}
          >
            Roadmap
          </button>{" "}
          in der Roadmap (Seitenleiste → Produkt).
        </p>
      </div>
    </div>
  );
};
