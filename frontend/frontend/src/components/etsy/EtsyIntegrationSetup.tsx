import { Link2, LogOut, Store } from "lucide-react";
import { useCallback } from "react";

import { etsyDisconnect, etsyOAuthStart } from "../../api/etsy";
import { getErrorMessage } from "../../lib/error";
import { toast } from "../../lib/toast";
import { useAppStore } from "../../store/appStore";
import { Button } from "../ui/Button";
import { IntegrationMissingCallout } from "../ui/IntegrationMissingCallout";

type EtsyIntegrationSetupProps = {
  /** Aus aggregiertem Status: bei bestehender Verbindung nur Einstellungen zeigen. */
  isConnected?: boolean;
};

/**
 * Etsy OAuth im zentralen Integrations-Setup.
 * Listings-Editor: vorübergehend nicht in der Hauptnavigation (siehe Roadmap).
 */
export const EtsyIntegrationSetup = ({ isConnected = false }: EtsyIntegrationSetupProps) => {
  const goToWorkspace = useAppStore((s) => s.goToWorkspace);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const handleConnect = useCallback(async () => {
    try {
      const { authorization_url: url, state } = await etsyOAuthStart();
      if (state) sessionStorage.setItem("etsy_oauth_state", state);
      window.location.href = url;
    } catch (e) {
      toast.error(`OAuth-Start fehlgeschlagen: ${getErrorMessage(e)}`);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    try {
      await etsyDisconnect();
      toast.success("Etsy getrennt.");
    } catch {
      toast.error("Trennen fehlgeschlagen.");
    }
  }, []);

  return (
    <div className="space-y-6">
      {!isConnected ? (
        <IntegrationMissingCallout
          title="Etsy ist nicht verbunden"
          description="Ohne OAuth-Verbindung kann die App keine Listings laden und keine Bulk-Uploads zu deinem Shop senden. Verknüpfe deinen Shop über den Button unten."
          actionLabel="Etsy verknüpfen"
          onSetup={() => void handleConnect()}
        />
      ) : null}

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-inset ring-orange-500/20">
            <Store size={20} strokeWidth={1.75} aria-hidden />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-slate-900">
              {isConnected ? "Etsy – Einstellungen" : "Etsy-Verbindung"}
            </h3>
            <p className="mt-1 max-w-xl text-sm font-medium leading-relaxed text-slate-500">
              {isConnected
                ? "OAuth ist aktiv. Listings und Bulk-Jobs findest du unter Erstellen → Etsy."
                : "Verknüpfe deinen Etsy-Shop per OAuth, um Entwürfe und Mockups direkt hochzuladen."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void handleConnect()}
            className="gap-2 bg-orange-600 text-white hover:bg-orange-700"
          >
            <Link2 size={16} strokeWidth={1.75} aria-hidden />
            Etsy verknüpfen
          </Button>
          <Button variant="outline" type="button" onClick={() => void handleDisconnect()}>
            <LogOut size={16} strokeWidth={1.75} aria-hidden /> Trennen
          </Button>
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-900/5">
        <p className="text-sm font-medium text-slate-600">
          <span className="font-bold text-slate-900">Mockups & ZIP-Export</span> startest du unter{" "}
          <button
            type="button"
            className="text-indigo-600 hover:text-indigo-800 hover:underline"
            onClick={() => goToWorkspace("generator")}
          >
            Erstellen → Generator
          </button>
          . Der Etsy-Listings-Editor ist vorübergehend nicht in der Navigation — siehe{" "}
          <button
            type="button"
            className="text-indigo-600 hover:text-indigo-800 hover:underline"
            onClick={() => setActiveTab("roadmap")}
          >
            Roadmap
          </button>
          .
        </p>
      </div>
    </div>
  );
};
