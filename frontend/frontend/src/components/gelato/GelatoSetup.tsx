import {
  AlertCircle,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  Store,
  Unplug,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type {
  GelatoConnectionStatus,
  GelatoStore,
  GelatoTemplate,
} from "../../api/gelato";
import {
  gelatoConnect,
  gelatoDisconnect,
  gelatoListTemplates,
  gelatoSelectStore,
  gelatoStatus,
  gelatoSyncTemplates,
} from "../../api/gelato";
import { getErrorMessage } from "../../lib/common/error";
import { toast } from "../../lib/ui/toast";
import { AppPage } from "../ui/layout/AppPage";
import { Button } from "../ui/primitives/Button";
import { Card } from "../ui/primitives/Card";
import { Input } from "../ui/primitives/Input";

type SetupStep = "key" | "store-select" | "connected";

type GelatoSetupProps = {
  /** Im Setup Hub: bei bestehender Verbindung kompakte Einstellungs-Ansicht. */
  hubSettingsMode?: boolean;
};

export const GelatoSetup = ({ hubSettingsMode = false }: GelatoSetupProps) => {
  const [step, setStep] = useState<SetupStep>("key");
  const [connection, setConnection] = useState<GelatoConnectionStatus | null>(null);
  const [templates, setTemplates] = useState<GelatoTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [stores, setStores] = useState<GelatoStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectingStore, setSelectingStore] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [templateIdInput, setTemplateIdInput] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const status = await gelatoStatus();
      setConnection(status);
      if (status.connected) {
        setStep("connected");
        const tpls = await gelatoListTemplates();
        setTemplates(tpls);
      }
    } catch {
      setConnection(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleConnect = async () => {
    if (!apiKey.trim()) return;
    setConnecting(true);
    try {
      const result = await gelatoConnect(apiKey.trim());
      setStores(result.stores);
      if (result.stores.length === 1) {
        setSelectedStoreId(result.stores[0].id);
      }
      setStep("store-select");
      toast.success(
        `API-Key verifiziert! ${result.stores.length} Store${result.stores.length !== 1 ? "s" : ""} gefunden.`,
      );
    } catch (e) {
      toast.error(`Verbindung fehlgeschlagen: ${getErrorMessage(e)}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleSelectStore = async () => {
    if (!selectedStoreId) return;
    setSelectingStore(true);
    try {
      const store = stores.find((s) => s.id === selectedStoreId);
      const result = await gelatoSelectStore(selectedStoreId, store?.name ?? "");
      setConnection(result);
      setStep("connected");
      setApiKey("");
      toast.success("Store ausgewählt – Gelato ist einsatzbereit!");
      const tpls = await gelatoListTemplates();
      setTemplates(tpls);
    } catch (e) {
      toast.error(`Store-Auswahl fehlgeschlagen: ${getErrorMessage(e)}`);
    } finally {
      setSelectingStore(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await gelatoDisconnect();
      setConnection(null);
      setTemplates([]);
      setStores([]);
      setSelectedStoreId("");
      setStep("key");
      toast.success("Gelato-Verbindung getrennt.");
    } catch (e) {
      toast.error(`Fehler: ${getErrorMessage(e)}`);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSyncTemplates = async () => {
    const ids = templateIdInput
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      toast.error("Bitte mindestens eine Template-ID eingeben.");
      return;
    }
    setSyncing(true);
    try {
      const result = await gelatoSyncTemplates(ids);
      const tpls = Array.isArray(result) ? result : result.templates;
      setTemplates((prev) => {
        const existing = new Map(prev.map((t) => [t.gelato_template_id, t]));
        for (const t of tpls) existing.set(t.gelato_template_id, t);
        return Array.from(existing.values());
      });
      setTemplateIdInput("");
      const errCount = !Array.isArray(result) ? result.errors?.length ?? 0 : 0;
      if (errCount > 0) {
        toast.error(`${tpls.length} synchronisiert, ${errCount} fehlgeschlagen.`);
      } else {
        toast.success(`${tpls.length} Templates synchronisiert.`);
      }
    } catch (e) {
      toast.error(`Sync fehlgeschlagen: ${getErrorMessage(e)}`);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  /* ── Step 1: API-Key eingeben ──────────────────────────────── */
  if (step === "key") {
    return (
      <AppPage>
      <div className="w-full min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Gelato verbinden
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gib deinen Gelato API-Key ein, um deine Stores zu laden.
          </p>
        </div>

        <Card>
          <div className="space-y-4">
            {/* Progress indicator */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                1
              </span>
              <span className="text-indigo-600">API-Key</span>
              <ChevronRight size={12} />
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500">
                2
              </span>
              <span>Store wählen</span>
            </div>

            <div className="relative">
              <Input
                label="API-Key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Dein Gelato API-Key…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleConnect();
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey((p) => !p)}
                className="absolute right-3 top-[34px] text-slate-400 transition-colors hover:text-slate-600"
                aria-label={showKey ? "Key verbergen" : "Key anzeigen"}
                tabIndex={0}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Du findest den Key im{" "}
              <a
                href="https://dashboard.gelato.com/api-integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-500 underline hover:text-indigo-700"
              >
                Gelato Dashboard
              </a>{" "}
              unter API-Integrationen.
            </p>

            <Button
              onClick={handleConnect}
              disabled={connecting || !apiKey.trim()}
              className="w-full"
            >
              {connecting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verbinde…
                </>
              ) : (
                <>
                  <Key size={16} /> Verbinden
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
      </AppPage>
    );
  }

  /* ── Step 2: Store auswählen ───────────────────────────────── */
  if (step === "store-select") {
    return (
      <AppPage>
      <div className="w-full min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Store auswählen
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            API-Key verifiziert! Wähle den Store, den du für deine Uploads nutzen möchtest.
          </p>
        </div>

        <Card>
          <div className="space-y-4">
            {/* Progress indicator */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
                <Check size={10} />
              </span>
              <span className="text-green-600">API-Key</span>
              <ChevronRight size={12} />
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                2
              </span>
              <span className="text-indigo-600">Store wählen</span>
            </div>

            <div className="space-y-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Deine Stores
              </label>
              {stores.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStoreId(s.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all duration-200 ${
                    selectedStoreId === s.id
                      ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                  aria-label={`Store ${s.name || s.id} auswählen`}
                  tabIndex={0}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      selectedStoreId === s.id
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <Store size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {s.name || "Unbenannter Store"}
                    </p>
                    <p className="truncate text-xs text-slate-400">{s.id}</p>
                  </div>
                  {selectedStoreId === s.id && (
                    <Check size={18} className="shrink-0 text-indigo-600" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setStep("key");
                  setStores([]);
                  setSelectedStoreId("");
                }}
                className="flex-1"
              >
                Zurück
              </Button>
              <Button
                onClick={handleSelectStore}
                disabled={!selectedStoreId || selectingStore}
                className="flex-1"
              >
                {selectingStore ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Speichere…
                  </>
                ) : (
                  <>
                    <Check size={16} /> Store verwenden
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
      </AppPage>
    );
  }

  /* ── Connected: Übersicht + Templates ──────────────────────── */
  return (
    <AppPage>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {hubSettingsMode ? "Gelato – Einstellungen" : "Gelato Integration"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {hubSettingsMode ? (
              <>
                Store{" "}
                <span className="font-medium text-slate-700">
                  {connection?.store_name || connection?.store_id}
                </span>
                , Templates und Verbindung verwalten.
              </>
            ) : (
              <>
                Verbunden mit Store{" "}
                <span className="font-medium text-slate-700">
                  {connection?.store_name || connection?.store_id}
                </span>
              </>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="text-red-500 hover:text-red-700"
        >
          {disconnecting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Unplug size={16} />
          )}
          Trennen
        </Button>
      </div>

      <Card padding="sm">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
            <Check size={14} className="text-green-600" />
          </div>
          <span className="font-medium text-slate-700">Verbindung aktiv</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500">Store-ID: {connection?.store_id}</span>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Templates hinzufügen
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          Gib die Template-IDs aus deinem Gelato Dashboard ein (kommagetrennt oder eine
          pro Zeile).
        </p>
        <div className="flex gap-2">
          <textarea
            value={templateIdInput}
            onChange={(e) => setTemplateIdInput(e.target.value)}
            placeholder="c12a363e-0d4e-4d96-be4b-bf4138eb8743, ..."
            rows={2}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <Button
            onClick={handleSyncTemplates}
            disabled={syncing || !templateIdInput.trim()}
            className="shrink-0 self-end"
          >
            {syncing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            Sync
          </Button>
        </div>
      </Card>

      {templates.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle size={40} className="mb-3 text-slate-300" strokeWidth={1.25} />
            <h3 className="text-base font-semibold text-slate-700">
              Keine Templates vorhanden
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Füge Template-IDs oben ein, um deine Gelato-Produktvorlagen zu laden.
            </p>
          </div>
        </Card>
      ) : (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Templates ({templates.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templates.map((tpl) => (
              <Card
                key={tpl.id}
                padding="none"
                interactive
                className="group flex flex-col overflow-hidden"
              >
                {tpl.preview_url ? (
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={tpl.preview_url}
                      alt={tpl.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-slate-50">
                    <RefreshCw size={24} className="text-slate-300" />
                  </div>
                )}
                <div className="p-3">
                  <h3
                    className="truncate text-sm font-medium text-slate-800"
                    title={tpl.name}
                  >
                    {tpl.name}
                  </h3>
                  <p
                    className="mt-0.5 truncate text-xs text-slate-400"
                    title={tpl.gelato_template_id}
                  >
                    {tpl.gelato_template_id}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </AppPage>
  );
};
