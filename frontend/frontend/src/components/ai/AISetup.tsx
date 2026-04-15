import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileJson,
  Globe,
  Key,
  Loader2,
  Sparkles,
  Unplug,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { AIConnectionStatus } from "../../api/ai";
import {
  aiConnect,
  aiDisconnect,
  aiStatus,
  aiUpdateGrounding,
  aiUpdateModel,
  aiUpdatePreferExpertMode,
  aiUpdateVertexServiceAccount,
} from "../../api/ai";
import { getErrorMessage } from "../../lib/error";
import { toast } from "../../lib/toast";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Dropzone } from "../ui/Dropzone";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

const MODEL_OPTIONS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (Preview)" },
  { value: "gemini-3-pro-preview", label: "Gemini 3 Pro (Preview)" },
  { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview)" },
];

const VERTEX_HELP_STEPS = [
  "Gehe in die Google Cloud Console und erstelle ein neues Projekt. Aktiviere dort zwingend die Abrechnung (Billing).",
  'Suche oben nach "Vertex AI API" und aktiviere sie.',
  'Gehe zu "IAM & Verwaltung" → "Dienstkonten" und erstelle ein neues Dienstkonto.',
  'WICHTIG: Vergib dem Dienstkonto die Rolle "Vertex AI-Nutzer" (Vertex AI User).',
  'Klicke auf das erstellte Konto, gehe auf den Reiter "Schlüssel" → "Schlüssel hinzufügen" → "Neuen Schlüssel erstellen" und wähle JSON.',
  "Lade die heruntergeladene .json-Datei hier hoch oder füge den Inhalt in das Textfeld ein. Die Project-ID wird automatisch aus der Datei gelesen.",
];

export const AISetup = () => {
  const [connection, setConnection] = useState<AIConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [modelName, setModelName] = useState("gemini-2.5-flash");
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [updatingModel, setUpdatingModel] = useState(false);
  const [togglingGrounding, setTogglingGrounding] = useState(false);
  const [togglingExpert, setTogglingExpert] = useState(false);

  const [vertexJsonDraft, setVertexJsonDraft] = useState("");
  const [vertexHelpOpen, setVertexHelpOpen] = useState(false);
  const [savingVertex, setSavingVertex] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await aiStatus();
      setConnection(s);
    } catch {
      setConnection(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleModelChange = async (newModel: string) => {
    setUpdatingModel(true);
    try {
      const result = await aiUpdateModel(newModel);
      setConnection(result);
      toast.success("Modell gewechselt.");
    } catch (e) {
      toast.error(`Modell-Wechsel fehlgeschlagen: ${getErrorMessage(e)}`);
    } finally {
      setUpdatingModel(false);
    }
  };

  const handleGroundingToggle = async () => {
    const next = !connection?.use_grounding;
    setTogglingGrounding(true);
    try {
      const result = await aiUpdateGrounding(next);
      setConnection(result);
      toast.success(next ? "Google Search aktiviert." : "Google Search deaktiviert.");
    } catch (e) {
      toast.error(`Fehler: ${getErrorMessage(e)}`);
    } finally {
      setTogglingGrounding(false);
    }
  };

  const handlePreferExpertToggle = async () => {
    const next = !connection?.prefer_expert_mode;
    setTogglingExpert(true);
    try {
      const result = await aiUpdatePreferExpertMode(next);
      setConnection(result);
      toast.success(
        next
          ? "Standard: Multi-Agent (Expert) beim KI-Button im Gelato-Export."
          : "Standard: klassische Einzel-Generierung.",
      );
    } catch (e) {
      toast.error(`Fehler: ${getErrorMessage(e)}`);
    } finally {
      setTogglingExpert(false);
    }
  };

  const handleConnect = async () => {
    if (!apiKey.trim()) return;
    setConnecting(true);
    try {
      const result = await aiConnect(apiKey.trim(), modelName);
      setConnection(result);
      setApiKey("");
      toast.success("KI-Verbindung erfolgreich hergestellt!");
    } catch (e) {
      toast.error(`Verbindung fehlgeschlagen: ${getErrorMessage(e)}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await aiDisconnect();
      setVertexJsonDraft("");
      await fetchStatus();
      toast.success("KI-Verbindung getrennt.");
    } catch (e) {
      toast.error(`Fehler: ${getErrorMessage(e)}`);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleVertexFilePick = useCallback((files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setVertexJsonDraft(text.trim());
      toast.success("JSON-Datei eingelesen.");
    };
    reader.onerror = () => toast.error("Datei konnte nicht gelesen werden.");
    reader.readAsText(f);
  }, []);

  const handleSaveVertex = async () => {
    setSavingVertex(true);
    try {
      const result = await aiUpdateVertexServiceAccount(vertexJsonDraft);
      setConnection(result);
      toast.success("Vertex-Dienstkonto gespeichert.");
    } catch (e) {
      toast.error(`Speichern fehlgeschlagen: ${getErrorMessage(e)}`);
    } finally {
      setSavingVertex(false);
    }
  };

  const handleRemoveVertex = async () => {
    setSavingVertex(true);
    try {
      const result = await aiUpdateVertexServiceAccount("");
      setConnection(result);
      setVertexJsonDraft("");
      toast.success("Vertex-Dienstkonto entfernt.");
    } catch (e) {
      toast.error(`Fehler: ${getErrorMessage(e)}`);
    } finally {
      setSavingVertex(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const geminiConnected = !!connection?.connected;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          KI-Integration
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Gemini für Texte und Tags, Google Cloud Vertex AI mit eigenem
          Dienstkonto für den Bild-Upscaler (BYOK).
        </p>
      </div>

      {/* —— Google Gemini —— */}
      <section aria-labelledby="gemini-heading">
        <h2 id="gemini-heading" className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Google Gemini
        </h2>

        {geminiConnected ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-600">
                  Verbunden mit{" "}
                  <span className="font-medium text-slate-800">
                    {connection?.provider === "gemini" ? "Google Gemini" : connection?.provider}
                  </span>
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => void handleDisconnect()}
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
                <span className="font-medium text-slate-700">Gemini aktiv</span>
              </div>
            </Card>

            <Card>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Select
                    label="Aktives Modell"
                    value={connection?.model_name ?? "gemini-2.5-flash"}
                    onChange={(e) => void handleModelChange(e.target.value)}
                    disabled={updatingModel}
                  >
                    {MODEL_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </Select>
                  {updatingModel && (
                    <Loader2 size={16} className="mt-5 animate-spin text-slate-400" />
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Du kannst das Modell jederzeit wechseln — dein API-Key bleibt gespeichert.
                </p>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                    <Globe size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Google Search Grounding
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Nutzt Echtzeit-Websuche für aktuelle Etsy-Trends, saisonale Keywords
                      und Wettbewerber-Begriffe.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={connection?.use_grounding ?? false}
                  aria-label="Google Search Grounding aktivieren"
                  tabIndex={0}
                  disabled={togglingGrounding}
                  onClick={() => void handleGroundingToggle()}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-50 ${
                    connection?.use_grounding ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                      connection?.use_grounding ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                    <Sparkles size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Multi-Agent Listing (Expert)
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Drei Agenten (Trend-Scout, Kritiker, Editor) nacheinander — sichtbar im
                      War Room und im{" "}
                      <span className="font-medium text-slate-700">KI-Aktivität</span>-Panel
                      unten rechts. Kann im Export-Dialog pro Aufruf geändert werden.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={connection?.prefer_expert_mode ?? false}
                  aria-label="Multi-Agent Listing als Standard"
                  tabIndex={0}
                  disabled={togglingExpert}
                  onClick={() => void handlePreferExpertToggle()}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-50 ${
                    connection?.prefer_expert_mode ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                      connection?.prefer_expert_mode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                  <Sparkles size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    So nutzt du die KI
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Gehe zum <span className="font-medium text-slate-700">Generator</span>,
                    lade deine Motive hoch und klicke auf{" "}
                    <span className="font-medium text-slate-700">Zu Gelato exportieren</span>.
                    Im Export-Dialog findest du bei jedem Motiv einen{" "}
                    <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-600">
                      <Sparkles size={12} /> KI
                    </span>{" "}
                    Button, der Titel, Beschreibung und Tags automatisch generiert. Optional
                    aktivierst du dort den Expert-Modus oder nutzt die Voreinstellung von
                    oben. Das Protokoll erscheint unten rechts unter{" "}
                    <span className="font-medium text-slate-700">KI-Aktivität</span>.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <Card>
            <div className="space-y-4">
              <div className="relative">
                <Input
                  label="Gemini API-Key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Dein Google Gemini API-Key…"
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
                Erstelle einen Key im{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-500 underline hover:text-indigo-700"
                >
                  Google AI Studio
                </a>
                . Dein Key wird verschlüsselt gespeichert und nie im Klartext angezeigt.
              </p>

              <Select
                label="Modell"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              >
                {MODEL_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>

              <Button
                onClick={() => void handleConnect()}
                disabled={connecting || !apiKey.trim()}
                className="w-full"
              >
                {connecting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Verbinde…
                  </>
                ) : (
                  <>
                    <Key size={16} /> Mit Gemini verbinden
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}
      </section>

      {/* —— Vertex AI Upscaler BYOK —— */}
      <section aria-labelledby="vertex-heading">
        <h2 id="vertex-heading" className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Google Cloud Vertex AI (Upscaler)
        </h2>

        <Card>
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50">
              <FileJson size={20} className="text-amber-700" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-900">
                Eigenes Dienstkonto (BYOK)
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Vertex AI Imagen-Upscaling wird über dein GCP-Projekt abgerechnet. Der
                JSON-Schlüssel wird verschlüsselt gespeichert — niemals im Klartext in der
                Datenbank.
              </p>
              {connection?.vertex_upscaler_configured ? (
                <p className="mt-2 text-xs font-medium text-emerald-700">
                  Ein Dienstkonto ist hinterlegt. Du kannst es durch erneutes Speichern
                  ersetzen oder unten entfernen.
                </p>
              ) : null}
            </div>
          </div>

          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/80">
            <button
              type="button"
              onClick={() => setVertexHelpOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-amber-950"
              aria-expanded={vertexHelpOpen}
            >
              <span>So erstellst du deinen Vertex AI JSON-Schlüssel für den Upscaler</span>
              {vertexHelpOpen ? (
                <ChevronUp size={18} className="shrink-0 text-amber-800" aria-hidden />
              ) : (
                <ChevronDown size={18} className="shrink-0 text-amber-800" aria-hidden />
              )}
            </button>
            {vertexHelpOpen ? (
              <ol className="list-decimal space-y-2 border-t border-amber-200/80 px-3 py-3 pl-8 text-xs text-amber-950/90">
                {VERTEX_HELP_STEPS.map((step, i) => (
                  <li key={i} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>

          <Dropzone
            title="JSON-Datei hierher ziehen oder klicken"
            description="Nur .json (Google-Dienstkonto-Export)"
            icon={<FileJson size={28} className="text-slate-400" />}
            accept="application/json,.json"
            onPickFiles={handleVertexFilePick}
            onChange={(e) => handleVertexFilePick(e.target.files)}
            className="mb-3 py-8"
          />

          <label className="mb-1 block text-xs font-medium text-slate-500">
            Oder JSON einfügen
          </label>
          <textarea
            value={vertexJsonDraft}
            onChange={(e) => setVertexJsonDraft(e.target.value)}
            rows={8}
            spellCheck={false}
            className="mb-4 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            placeholder='{ "type": "service_account", ... }'
            aria-label="Vertex Service Account JSON"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => void handleSaveVertex()}
              disabled={savingVertex || !vertexJsonDraft.trim()}
            >
              {savingVertex ? <Loader2 size={16} className="animate-spin" /> : null}
              Speichern
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleRemoveVertex()}
              disabled={savingVertex || !connection?.vertex_upscaler_configured}
            >
              Entfernen
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
};
