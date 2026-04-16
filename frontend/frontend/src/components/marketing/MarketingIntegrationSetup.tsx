import { Link2, LogOut, Megaphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  marketingConnectionStatus,
  marketingOAuthDisconnect,
  marketingOAuthStart,
} from "../../api/marketing";
import { useIntegrationFlags } from "../../hooks/useIntegrationFlags";
import { getErrorMessage } from "../../lib/error";
import { toast } from "../../lib/toast";
import { useAppStore } from "../../store/appStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { IntegrationMissingCallout } from "../ui/IntegrationMissingCallout";

/**
 * Pinterest OAuth im zentralen Integrations-Setup.
 * Pins & Queue: {@link MarketingDashboard} unter Hauptnavigation Verbreiten.
 */
export const MarketingIntegrationSetup = () => {
  const setActiveTab = useAppStore((s) => s.setActiveTab);
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
    void loadStatus();
  }, [loadStatus]);

  const handleConnect = useCallback(async () => {
    try {
      const { authorization_url: url } = await marketingOAuthStart();
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
    <div className="space-y-8">
      {showPinterestMissing ? (
        <IntegrationMissingCallout
          title="Pinterest ist nicht verbunden"
          description="Ohne OAuth-Verbindung kann die App keine Boards laden und keine Pins veröffentlichen. Verknüpfe dein Konto über den Button unten."
          actionLabel="Pinterest verknüpfen"
          onSetup={() => void handleConnect()}
        />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-rose-50 p-2.5">
            <Megaphone className="text-rose-600" size={22} strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {connected === true ? "Pinterest – Einstellungen" : "Pinterest verbinden"}
            </h2>
            {connected === true ? (
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Konto-Verbindung verwalten. Boards und Pins unter{" "}
                <span className="font-medium text-slate-700">Verbreiten</span>.
              </p>
            ) : (
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Verknüpfe dein Pinterest-Konto per OAuth (App-ID und Redirect-URI in der
                Pinterest Developer Console wie in der <code className="text-xs">.env</code>{" "}
                hinterlegt). Danach kannst du unter{" "}
                <span className="font-medium text-slate-700">Verbreiten</span> Boards wählen
                und Pins veröffentlichen.
              </p>
            )}
            {connected === true ? (
              <p className="mt-2 text-sm font-medium text-emerald-700">Status: verbunden</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void handleConnect()} className="gap-2">
            <Link2 size={16} strokeWidth={1.75} />
            Pinterest verknüpfen
          </Button>
          <Button variant="outline" type="button" onClick={() => void handleDisconnect()}>
            <LogOut size={16} strokeWidth={1.75} /> Trennen
          </Button>
        </div>
      </div>

      <Card className="border-rose-100 bg-rose-50/40">
        <p className="text-sm text-rose-950">
          <span className="font-semibold">Pins und Veröffentlichungs-Warteschlange</span>{" "}
          findest du unter{" "}
          <button
            type="button"
            className="font-medium text-rose-800 underline decoration-rose-300 underline-offset-2 hover:text-rose-950"
            onClick={() => setActiveTab("marketing")}
          >
            Verbreiten
          </button>{" "}
          in der Hauptnavigation.
        </p>
      </Card>
    </div>
  );
};
