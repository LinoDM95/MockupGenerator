import { Link2, LogOut, Store } from "lucide-react";
import { useCallback } from "react";

import { etsyDisconnect, etsyOAuthStart } from "../../api/etsy";
import { getErrorMessage } from "../../lib/error";
import { toast } from "../../lib/toast";
import { useAppStore } from "../../store/appStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { IntegrationMissingCallout } from "../ui/IntegrationMissingCallout";

type EtsyIntegrationSetupProps = {
  /** Aus aggregiertem Status: bei bestehender Verbindung nur Einstellungen zeigen. */
  isConnected?: boolean;
};

/**
 * Etsy OAuth im zentralen Integrations-Setup.
 * Listings & Editor: {@link EtsyListingsEditor} im Arbeitsbereich.
 */
export const EtsyIntegrationSetup = ({ isConnected = false }: EtsyIntegrationSetupProps) => {
  const goToWorkspace = useAppStore((s) => s.goToWorkspace);

  const handleConnect = useCallback(async () => {
    try {
      const { authorization_url: url } = await etsyOAuthStart();
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
    <div className="space-y-8">
      {!isConnected ? (
        <IntegrationMissingCallout
          title="Etsy ist nicht verbunden"
          description="Ohne OAuth-Verbindung kann die App keine Listings laden und keine Bulk-Uploads zu deinem Shop senden. Verknüpfe deinen Shop über den Button unten."
          actionLabel="Etsy verknüpfen"
          onSetup={() => void handleConnect()}
        />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-indigo-50 p-2.5">
            <Store className="text-indigo-600" size={22} strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {isConnected ? "Etsy – Einstellungen" : "Etsy verbinden"}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              {isConnected ? (
                <>
                  Shop-Verbindung verwalten. Listings und Bulk-Jobs findest du unter{" "}
                  <span className="font-medium text-slate-700">Erstellen → Etsy</span>.
                </>
              ) : (
                <>
                  Verknüpfe deinen Etsy-Shop per OAuth. Danach kannst du unter Erstellen
                  unter <span className="font-medium text-slate-700">Etsy</span> Listings
                  laden und Mockups per Bulk-Job hochladen.
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void handleConnect()} className="gap-2">
            <Link2 size={16} strokeWidth={1.75} />
            Etsy verknüpfen
          </Button>
          <Button variant="outline" type="button" onClick={() => void handleDisconnect()}>
            <LogOut size={16} strokeWidth={1.75} /> Trennen
          </Button>
        </div>
      </div>

      <Card className="border-indigo-100 bg-indigo-50/40">
        <p className="text-sm text-indigo-950">
          <span className="font-semibold">Listings und Listing-Editor</span> findest du
          unter{" "}
          <button
            type="button"
            className="font-medium text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900"
            onClick={() => goToWorkspace("etsy")}
          >
            Erstellen → Etsy
          </button>
          .
        </p>
      </Card>
    </div>
  );
};
