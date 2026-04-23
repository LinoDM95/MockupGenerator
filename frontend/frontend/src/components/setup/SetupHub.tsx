import { motion } from "framer-motion";
import {
  CheckCircle2,
  Link2,
  Loader2,
  Lock,
  Package,
  Pin,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { IntegrationStatusResponse } from "../../api/settings";
import { fetchIntegrationStatus } from "../../api/settings";
import { getErrorMessage } from "../../lib/common/error";
import {
  getDefaultHubTab,
  isIntegrationHubUiEnabled,
  type HubTabId,
} from "../../lib/common/integrationAvailability";
import { cn } from "../../lib/ui/cn";
import { toast } from "../../lib/ui/toast";
import { WORKSPACE_PANEL_SURFACE, WORKSPACE_ZINC_MUTED } from "../../lib/ui/workspaceSurfaces";
import { useAppStore } from "../../store/appStore";
import { AISetup } from "../ai/AISetup";
import { EtsyIntegrationSetup } from "../etsy/EtsyIntegrationSetup";
import { GelatoSetup } from "../gelato/GelatoSetup";
import { MarketingIntegrationSetup } from "../marketing/MarketingIntegrationSetup";
import { Button } from "../ui/primitives/Button";
import { PanelModal } from "../ui/overlay/PanelModal";

export type { HubTabId };

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
  return s.pinterest;
};

export const SetupHub = () => {
  const integrationHubSection = useAppStore((s) => s.integrationHubSection);
  const setIntegrationHubSection = useAppStore((s) => s.setIntegrationHubSection);

  const [tab, setTab] = useState<HubTabId>(() => getDefaultHubTab());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [status, setStatus] = useState<IntegrationStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

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

  const handleOpenSettings = (next: HubTabId) => {
    if (!isIntegrationHubUiEnabled(next)) {
      toast.info("Diese Integration ist derzeit noch nicht freigeschaltet.");
      return;
    }
    setTab(next);
    setSettingsOpen(true);
  };

  const settingsModalTitle = `${INTEGRATION_CARDS.find((c) => c.id === tab)?.title ?? "Integration"} – Einstellungen`;

  return (
    <div className="w-full min-w-0 space-y-8">
      <p className="max-w-3xl text-sm font-medium leading-relaxed text-[color:var(--pf-fg-muted)]">
        Verwalte Shop-Verbindungen und API-Keys zentral. Karten mit „In Vorbereitung“ sind vorübergehend
        gesperrt und können noch nicht eingerichtet werden.
      </p>

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
              <div
                className={cn(
                  "flex h-full min-h-0 flex-col justify-between p-5",
                  WORKSPACE_PANEL_SURFACE,
                  selected && hubEnabled && "ring-2 ring-[color:var(--pf-accent)]/35",
                  !hubEnabled && "opacity-[0.72] saturate-[0.7]",
                )}
                aria-disabled={!hubEnabled}
              >
                <div>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-[length:var(--pf-radius-lg)] ring-1",
                        hubEnabled
                          ? "bg-[color:var(--pf-accent-bg)] text-[color:var(--pf-accent)] ring-[color:var(--pf-accent-border)]"
                          : "bg-[color:var(--pf-bg-muted)] text-[color:var(--pf-fg-muted)] ring-inset ring-[color:var(--pf-border-subtle)]",
                      )}
                    >
                      <Icon size={22} strokeWidth={1.5} />
                    </div>
                    {loadingStatus ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--pf-bg-muted)] px-2.5 py-1 text-xs font-bold text-[color:var(--pf-fg-muted)] ring-1 ring-inset ring-[color:var(--pf-border-subtle)]">
                        <Loader2 size={12} className="animate-spin" aria-hidden />
                        …
                      </span>
                    ) : !hubEnabled ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--pf-warning-bg)] px-2.5 py-1 text-xs font-bold text-[color:var(--pf-warning)] ring-1 ring-inset ring-[color:var(--pf-warning)]/25">
                        <Lock size={12} strokeWidth={2.5} aria-hidden />
                        In Vorbereitung
                      </span>
                    ) : ok ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--pf-success-bg)] px-2.5 py-1 text-xs font-bold text-[color:var(--pf-success)] ring-1 ring-inset ring-[color:var(--pf-success)]/25">
                        <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden />
                        Verbunden
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--pf-bg-muted)] px-2.5 py-1 text-xs font-bold text-[color:var(--pf-fg-muted)] ring-1 ring-inset ring-[color:var(--pf-border-subtle)]">
                        <Link2 size={12} strokeWidth={2.5} aria-hidden />
                        Getrennt
                      </span>
                    )}
                  </div>
                  <h3
                    className={cn(
                      "text-lg font-bold tracking-tight text-[color:var(--pf-fg)]",
                      !hubEnabled && "text-[color:var(--pf-fg-subtle)]",
                    )}
                  >
                    {item.title}
                  </h3>
                  <p className={cn("mt-1 text-sm font-medium leading-relaxed", WORKSPACE_ZINC_MUTED)}>
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 border-t border-[color:var(--pf-border)] pt-4">
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
                    className={cn("w-full")}
                    onClick={() => handleOpenSettings(item.id)}
                  >
                    {!hubEnabled
                      ? "Derzeit nicht verfügbar"
                      : ok
                        ? "Einstellungen öffnen"
                        : "Jetzt einrichten"}
                  </Button>
                </div>
              </div>
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
        <div className="min-w-0">
          {tab === "etsy" ? <EtsyIntegrationSetup isConnected={!!status?.etsy} /> : null}
          {tab === "gelato" ? <GelatoSetup hubSettingsMode /> : null}
          {tab === "gemini" ? <AISetup hubSettingsMode /> : null}
          {tab === "pinterest" ? <MarketingIntegrationSetup /> : null}
        </div>
      </PanelModal>
    </div>
  );
};
