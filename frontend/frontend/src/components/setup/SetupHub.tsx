import { motion } from "framer-motion";
import {
  CheckCircle2,
  Cloud,
  LayoutGrid,
  Link2,
  Loader2,
  Lock,
  Package,
  Pin,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "../../api/client";
import type { IntegrationStatusResponse } from "../../api/settings";
import {
  fetchIntegrationStatus,
  saveIntegration,
  testIntegrationConnection,
} from "../../api/settings";
import { getErrorMessage } from "../../lib/error";
import {
  getDefaultHubTab,
  isIntegrationHubUiEnabled,
  type HubTabId,
} from "../../lib/integrationAvailability";
import { cn } from "../../lib/cn";
import { toast } from "../../lib/toast";
import { useAppStore } from "../../store/appStore";
import { AISetup } from "../ai/AISetup";
import { EtsyIntegrationSetup } from "../etsy/EtsyIntegrationSetup";
import { GelatoSetup } from "../gelato/GelatoSetup";
import { MarketingIntegrationSetup } from "../marketing/MarketingIntegrationSetup";
import { AppPageSectionHeader } from "../ui/AppPageSectionHeader";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { PanelModal } from "../ui/PanelModal";

export type { HubTabId };

const R2_GUIDE = {
  title: "Cloudflare R2",
  tagline:
    "R2 (S3-kompatibel) für temporäre Uploads und Assets – BYOK mit eigenem Bucket.",
  steps: [
    "Im Cloudflare-Dashboard R2 aktivieren und S3-kompatible Access-/Secret-Keys anlegen.",
    "Endpoint (HTTPS), Bucket-Name und Keys unten eintragen und speichern.",
    "Test ausführen, um Bucket-Zugriff zu prüfen.",
  ] as [string, string, string],
  docs: [
    { href: "https://developers.cloudflare.com/r2/", label: "Cloudflare R2 Docs" },
    { href: "https://developers.cloudflare.com/r2/api/s3/api/", label: "S3 API für R2" },
  ],
};

const INTEGRATION_CARDS: {
  id: HubTabId;
  title: string;
  desc: string;
  icon: typeof ShoppingBag;
}[] = [
  {
    id: "etsy",
    title: "Etsy Shop",
    desc: "OAuth-Verbindung für Listing-Entwürfe und Bulk-Uploads.",
    icon: ShoppingBag,
  },
  {
    id: "gelato",
    title: "Gelato Print",
    desc: "API-Anbindung für Produkt-Export und Druck.",
    icon: Package,
  },
  {
    id: "gemini",
    title: "Google Gemini",
    desc: "Eigener API-Key für KI-Listing-Texte.",
    icon: Sparkles,
  },
  {
    id: "cloudflare_r2",
    title: "Cloudflare R2",
    desc: "S3-kompatible Keys für temporäre Uploads und Assets.",
    icon: Cloud,
  },
  {
    id: "pinterest",
    title: "Pinterest",
    desc: "OAuth für Boards, Pins und Marketing-Flows.",
    icon: Pin,
  },
];

const statusField = (tab: HubTabId, s: IntegrationStatusResponse | null): boolean => {
  if (!s) return false;
  if (tab === "etsy") return s.etsy;
  if (tab === "gelato") return s.gelato;
  if (tab === "gemini") return s.gemini;
  if (tab === "cloudflare_r2") return s.cloudflare_r2;
  return s.pinterest;
};

export const SetupHub = () => {
  const integrationHubSection = useAppStore((s) => s.integrationHubSection);
  const setIntegrationHubSection = useAppStore((s) => s.setIntegrationHubSection);

  const [tab, setTab] = useState<HubTabId>(() => getDefaultHubTab());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [status, setStatus] = useState<IntegrationStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [r2Access, setR2Access] = useState("");
  const [r2Secret, setR2Secret] = useState("");
  const [r2Endpoint, setR2Endpoint] = useState("");
  const [r2Bucket, setR2Bucket] = useState("");

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [fieldTone, setFieldTone] = useState<"neutral" | "success" | "error">("neutral");
  const [feedback, setFeedback] = useState("");

  const loadStatus = useCallback(async (force?: boolean) => {
    setLoadingStatus(true);
    try {
      const j = await fetchIntegrationStatus(force ? { force: true } : undefined);
      setStatus(j);
    } catch {
      setStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    if (!integrationHubSection) return;
    if (!isIntegrationHubUiEnabled(integrationHubSection)) {
      toast.info("Diese Integration ist derzeit noch nicht freigeschaltet.");
      setIntegrationHubSection(null);
      return;
    }
    setTab(integrationHubSection);
    setIntegrationHubSection(null);
  }, [integrationHubSection, setIntegrationHubSection]);

  useEffect(() => {
    void loadStatus();
  }, [tab, loadStatus]);

  const resetFeedback = () => {
    setFieldTone("neutral");
    setFeedback("");
  };

  const handleOpenSettings = (next: HubTabId) => {
    if (!isIntegrationHubUiEnabled(next)) {
      toast.info("Diese Integration ist derzeit noch nicht freigeschaltet.");
      return;
    }
    setTab(next);
    resetFeedback();
    setSettingsOpen(true);
  };

  const settingsModalTitle = `${INTEGRATION_CARDS.find((c) => c.id === tab)?.title ?? "Integration"} – Einstellungen`;

  const inputRingClass =
    fieldTone === "success"
      ? "border-emerald-500 ring-2 ring-emerald-500/30"
      : fieldTone === "error"
        ? "border-red-500 ring-2 ring-red-500/30"
        : "";

  const handleSaveR2 = async () => {
    resetFeedback();
    setSaving(true);
    try {
      await saveIntegration("cloudflare_r2", {
        access_key: r2Access.trim(),
        secret_key: r2Secret.trim(),
        endpoint: r2Endpoint.trim(),
        bucket_name: r2Bucket.trim(),
      });
      toast.success("Gespeichert.");
      await loadStatus(true);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleTestR2 = async () => {
    resetFeedback();
    setTesting(true);
    try {
      await testIntegrationConnection("cloudflare_r2");
      setFieldTone("success");
      setFeedback("Verbindung erfolgreich.");
    } catch (e) {
      setFieldTone("error");
      if (e instanceof ApiError) {
        setFeedback(e.getDetail());
      } else {
        setFeedback(getErrorMessage(e));
      }
    } finally {
      setTesting(false);
    }
  };

  const embedded =
    tab === "etsy" || tab === "gelato" || tab === "gemini" || tab === "pinterest";

  const connected = statusField(tab, status);
  const r2Configured = !!status?.cloudflare_r2;
  const g = R2_GUIDE;

  return (
    <div className="w-full min-w-0 space-y-8 pb-12">
      <AppPageSectionHeader
        icon={LayoutGrid}
        title="Alle Integrationen"
        description="Verwalte Shop-Verbindungen und API-Keys zentral. Karten mit „In Vorbereitung“ sind vorübergehend gesperrt und können noch nicht eingerichtet werden."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {INTEGRATION_CARDS.map((item, i) => {
          const hubEnabled = isIntegrationHubUiEnabled(item.id);
          const ok = statusField(item.id, status);
          const Icon = item.icon;
          const selected = tab === item.id;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card
                padding="md"
                className={cn(
                  "flex h-full flex-col justify-between transition-shadow",
                  selected && hubEnabled && "ring-2 ring-indigo-400/50",
                  !hubEnabled && "opacity-[0.72] saturate-[0.7]",
                )}
                aria-disabled={!hubEnabled}
              >
                <div>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-900/5",
                        !hubEnabled && "bg-slate-100 text-slate-400",
                      )}
                    >
                      <Icon size={22} strokeWidth={1.5} />
                    </div>
                    {loadingStatus ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-inset ring-slate-900/5">
                        <Loader2 size={12} className="animate-spin" aria-hidden />
                        …
                      </span>
                    ) : !hubEnabled ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-500/25">
                        <Lock size={12} strokeWidth={2.5} aria-hidden />
                        In Vorbereitung
                      </span>
                    ) : ok ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-500/20">
                        <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden />
                        Verbunden
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-inset ring-slate-900/5">
                        <Link2 size={12} strokeWidth={2.5} aria-hidden />
                        Getrennt
                      </span>
                    )}
                  </div>
                  <h3
                    className={cn(
                      "text-lg font-bold tracking-tight text-slate-900",
                      !hubEnabled && "text-slate-500",
                    )}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4">
                  <Button
                    type="button"
                    variant={hubEnabled ? (ok ? "outline" : "secondary") : "outline"}
                    size="sm"
                    disabled={!hubEnabled || loadingStatus}
                    title={
                      !hubEnabled
                        ? "Diese Integration ist derzeit noch nicht freigeschaltet."
                        : undefined
                    }
                    className={cn(
                      "w-full",
                      hubEnabled && ok && "text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
                    )}
                    onClick={() => handleOpenSettings(item.id)}
                  >
                    {!hubEnabled
                      ? "Derzeit nicht verfügbar"
                      : ok
                        ? "Einstellungen öffnen"
                        : "Jetzt einrichten"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <PanelModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={settingsModalTitle}
        size="2xl"
      >
        {embedded ? (
          <div className="min-w-0">
            {tab === "etsy" ? (
              <EtsyIntegrationSetup isConnected={!!status?.etsy} />
            ) : null}
            {tab === "gelato" ? <GelatoSetup hubSettingsMode /> : null}
            {tab === "gemini" ? <AISetup hubSettingsMode /> : null}
            {tab === "pinterest" ? <MarketingIntegrationSetup /> : null}
          </div>
        ) : (
          <div>
            <header className="mb-6">
              <p className="text-sm text-slate-600">
                {r2Configured
                  ? "Credentials sind gespeichert. Zum Ändern neue Werte eintragen und speichern oder Verbindung testen."
                  : g.tagline}
              </p>
            </header>

            {!r2Configured ? (
              <>
                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-medium text-slate-800">Anleitung</h3>
                  <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
                    <li>{g.steps[0]}</li>
                    <li>{g.steps[1]}</li>
                    <li>{g.steps[2]}</li>
                  </ol>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {g.docs.map((l) => (
                      <a
                        key={l.href}
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-indigo-600 underline-offset-2 hover:underline"
                      >
                        {l.label}
                      </a>
                    ))}
                  </div>
                </div>

                <div
                  className="mb-6 flex aspect-video items-center justify-center rounded-md bg-slate-100 text-sm text-slate-500"
                  aria-hidden
                >
                  Video Placeholder
                </div>
              </>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="R2 Endpoint (HTTPS)"
                name="r2_endpoint"
                type="url"
                placeholder="https://…"
                value={r2Endpoint}
                onChange={(e) => setR2Endpoint(e.target.value)}
                className={cn("sm:col-span-2", inputRingClass)}
              />
              <Input
                label="Bucket-Name"
                name="r2_bucket"
                value={r2Bucket}
                onChange={(e) => setR2Bucket(e.target.value)}
                className={inputRingClass}
              />
              <Input
                label="Access Key"
                name="r2_access"
                type="password"
                autoComplete="off"
                value={r2Access}
                onChange={(e) => setR2Access(e.target.value)}
                className={inputRingClass}
              />
              <Input
                label="Secret Key"
                name="r2_secret"
                type="password"
                autoComplete="off"
                value={r2Secret}
                onChange={(e) => setR2Secret(e.target.value)}
                className={inputRingClass}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6">
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveR2}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Speichern
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestR2}
                disabled={testing}
                aria-busy={testing}
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Verbindung testen
              </Button>
            </div>

            <div className="mt-4 min-h-[1.5rem] text-sm" aria-live="polite" role="status">
              {feedback ? (
                <span
                  className={cn(
                    fieldTone === "success" && "text-emerald-700",
                    fieldTone === "error" && "text-red-700",
                  )}
                >
                  {feedback}
                </span>
              ) : connected ? (
                <span className="text-emerald-700">R2-Credentials gespeichert.</span>
              ) : null}
            </div>
          </div>
        )}
      </PanelModal>
    </div>
  );
};
