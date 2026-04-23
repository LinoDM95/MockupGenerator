import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  Loader2,
  Package,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  AIConnectionStatus,
  AIListingResult,
  ExpertListingStepResponse,
} from "../../api/ai";
import {
  fetchAiStatus,
  generateListing,
  generateListingExpertStep,
} from "../../api/ai";
import { ApiError } from "../../api/client";
import type { ArtworkMetadata, GelatoTemplate } from "../../api/gelato";
import { cn } from "../../lib/ui/cn";
import { getErrorMessage } from "../../lib/common/error";
import { toast } from "../../lib/ui/toast";
import { useIntegrationFlags } from "../../hooks/useIntegrationFlags";
import { useAiActivityStore } from "../../store/aiActivityStore";
import { useAppStore } from "../../store/appStore";
import type { ArtworkItem } from "../../types/mockup";
import { ArtworkListThumbnail } from "../generator/ArtworkListThumbnail";
import { Button } from "../ui/primitives/Button";
import { IntegrationMissingCallout } from "../ui/patterns/IntegrationMissingCallout";
import { Input } from "../ui/primitives/Input";
import { Select } from "../ui/primitives/Select";
import {
  ExpertDebateConsole,
  type ExpertDebatePhase,
} from "./ExpertDebateConsole";

const RECENT_CONTEXTS_KEY = "ai_recent_contexts";
const MAX_RECENT_CONTEXTS = 5;

const getRecentContexts = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_CONTEXTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  } catch {
    return [];
  }
};

const pushRecentContext = (ctx: string): void => {
  const trimmed = ctx.trim();
  if (!trimmed) return;
  const prev = getRecentContexts().filter((c) => c !== trimmed);
  const next = [trimmed, ...prev].slice(0, MAX_RECENT_CONTEXTS);
  try {
    localStorage.setItem(RECENT_CONTEXTS_KEY, JSON.stringify(next));
  } catch {
    /* quota exceeded – ignore */
  }
};

const PRODUCT_TYPES = [
  { value: "", label: "Kein Produkttyp angeben" },
  { value: "Poster", label: "Poster" },
  { value: "Framed Poster", label: "Framed Poster" },
  { value: "Canvas Print", label: "Canvas / Leinwand" },
  { value: "Art Print", label: "Art Print" },
  { value: "Metal Print", label: "Metal Print / Alu-Dibond" },
  { value: "T-Shirt", label: "T-Shirt" },
  { value: "Hoodie", label: "Hoodie" },
  { value: "Sweatshirt", label: "Sweatshirt" },
  { value: "Mug", label: "Tasse / Mug" },
  { value: "Tote Bag", label: "Tote Bag / Tragetasche" },
  { value: "Phone Case", label: "Phone Case" },
  { value: "Greeting Card", label: "Grusskarte" },
  { value: "Sticker", label: "Sticker" },
  { value: "Notebook", label: "Notizbuch" },
  { value: "Calendar", label: "Kalender" },
  { value: "Photo Book", label: "Fotobuch" },
] as const;

const isServiceUnavailable = (msg: string, httpStatus?: number): boolean => {
  if (httpStatus === 503) return true;
  const lower = msg.toLowerCase();
  return (
    lower.includes("503") ||
    lower.includes("überlastet") ||
    lower.includes("unavailable")
  );
};

const isParseError = (msg: string, httpStatus?: number): boolean =>
  httpStatus === 502 || msg.includes("JSON");

const buildAiFailureHint = (msg: string, httpStatus?: number): string => {
  if (isServiceUnavailable(msg, httpStatus)) {
    return "Der KI-Dienst ist gerade nicht erreichbar (überlastet oder Wartung). Bitte in einigen Minuten erneut versuchen oder unter KI-Integration ein anderes Modell wählen (z. B. Flash statt Pro).";
  }
  if (isParseError(msg, httpStatus)) {
    return "Die KI hat eine ungültige Antwort geliefert. Das passiert manchmal bei Überlastung. Bitte erneut versuchen oder das Modell wechseln.";
  }
  return "Die KI-Anfrage ist fehlgeschlagen. Bitte später erneut versuchen oder unter KI-Integration ein anderes Modell wählen.";
};

const MAX_CONSECUTIVE_FAILURES = 3;

/** Hover-Vorschau: feste Breite w-80 (320px), Höhe bis ~60vh — in den Viewport clampen. */
const PREVIEW_POPOVER_W = 320;
const PREVIEW_POPOVER_EST_H = 400;

const clampPreviewPopoverPosition = (
  clientX: number,
  clientY: number,
): { left: number; top: number } => {
  if (typeof window === "undefined") {
    return { left: clientX + 8, top: clientY };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 8;
  const gap = 10;
  const estH = Math.min(Math.round(vh * 0.58), PREVIEW_POPOVER_EST_H);

  let left = clientX + gap;
  if (left + PREVIEW_POPOVER_W > vw - margin) {
    left = Math.max(margin, clientX - PREVIEW_POPOVER_W - gap);
  }
  left = Math.max(margin, Math.min(left, vw - PREVIEW_POPOVER_W - margin));

  let top = clientY - estH - gap;
  if (top < margin) {
    top = clientY + gap;
  }
  if (top + estH > vh - margin) {
    top = vh - estH - margin;
  }
  top = Math.max(margin, Math.min(top, vh - estH - margin));
  return { left, top };
};

const createInitialExpertPhases = (): ExpertDebatePhase[] => [
  { key: "scout", label: "Agent 1 · Trend-Scout", status: "pending" },
  { key: "critic", label: "Agent 2 · Kritiker", status: "pending" },
  { key: "editor", label: "Agent 3 · Editor", status: "pending" },
];

/** Kritiker: UI & War Room — `thought` oft leer, Inhalt in critique / flaws / … */
const MAX_EXPERT_DETAIL_CHARS = 600;

const clipExpertDetail = (s: string): string =>
  s.length > MAX_EXPERT_DETAIL_CHARS
    ? `${s.slice(0, MAX_EXPERT_DETAIL_CHARS)}…`
    : s;

const coerceStringList = (v: unknown, maxItems: number): string[] => {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== "string" || !x.trim()) continue;
    out.push(x.trim());
    if (out.length >= maxItems) break;
  }
  return out;
};

const buildCriticDetailFromData = (data: Record<string, unknown>): string => {
  const parts: string[] = [];

  const rawCrit = data["critique"];
  if (rawCrit !== undefined && rawCrit !== null && rawCrit !== "") {
    if (typeof rawCrit === "string") {
      const s = rawCrit.trim();
      if (s) parts.push(s);
    } else {
      try {
        const j = JSON.stringify(rawCrit);
        if (j !== "{}" && j !== "[]") {
          parts.push(j.length > 400 ? `${j.slice(0, 397)}…` : j);
        }
      } catch {
        parts.push(String(rawCrit).slice(0, 400));
      }
    }
  }

  const flaws = coerceStringList(data["flaws"], 8);
  if (flaws.length) {
    parts.push(`Mängel:\n${flaws.map((x) => `• ${x}`).join("\n")}`);
  }
  const suggestions = coerceStringList(data["suggestions"], 8);
  if (suggestions.length) {
    parts.push(`Vorschläge:\n${suggestions.map((x) => `• ${x}`).join("\n")}`);
  }
  const legal = coerceStringList(data["legal_risks"], 5);
  if (legal.length) {
    parts.push(`Rechts-/Markenrisiken:\n${legal.map((x) => `• ${x}`).join("\n")}`);
  }

  const titleTag = coerceStringList(data["title_tag_word_conflicts"], 6);
  if (titleTag.length) {
    parts.push(
      `Titel↔Tag-Overlap (Zero-Redundanz):\n${titleTag.map((x) => `• ${x}`).join("\n")}`,
    );
  }
  const subjective = coerceStringList(data["subjective_words_in_title"], 5);
  if (subjective.length) {
    parts.push(
      `Subjektive Titel-Wörter:\n${subjective.map((x) => `• ${x}`).join("\n")}`,
    );
  }
  const longTags = coerceStringList(data["tags_over_20_chars"], 5);
  if (longTags.length) {
    parts.push(`Tags >20 Zeichen:\n${longTags.map((x) => `• ${x}`).join("\n")}`);
  }
  const blocking = data["deterministic_blocking"];
  if (blocking === true) {
    parts.push("Deterministische Prüfung: mindestens ein harter Befund (siehe oben).");
  }

  return parts.filter(Boolean).join("\n\n");
};

const expertCriticDetailForUi = (r: ExpertListingStepResponse): string => {
  const t = r.thought?.trim();
  if (t) return clipExpertDetail(t);
  const data = r.data ?? {};
  const fromData = buildCriticDetailFromData(data);
  if (fromData.trim()) return clipExpertDetail(fromData.trim());
  return "(kein Gedankentext)";
};

const SCOUT_DETAIL_DESC_MAX = 280;

const firstScoutTitleFromData = (data: Record<string, unknown>): string => {
  const titles = data["titles"];
  if (!Array.isArray(titles)) return "";
  for (const x of titles) {
    const s = typeof x === "string" ? x.trim() : String(x).trim();
    if (s) return s;
  }
  return "";
};

const buildScoutDetailFromData = (data: Record<string, unknown>): string => {
  const parts: string[] = [];
  const title = firstScoutTitleFromData(data);
  if (title) {
    parts.push(`Titelvorschlag: ${title}`);
  }
  const descRaw = data["description"];
  if (typeof descRaw === "string" && descRaw.trim()) {
    let d = descRaw.trim();
    if (d.length > SCOUT_DETAIL_DESC_MAX) {
      d = `${d.slice(0, SCOUT_DETAIL_DESC_MAX)}…`;
    }
    parts.push(`Beschreibung (Auszug):\n${d}`);
  }
  const tagsRaw = data["tags"];
  if (Array.isArray(tagsRaw) && tagsRaw.length > 0) {
    const tags = tagsRaw
      .map((x) => (typeof x === "string" ? x.trim() : String(x).trim()))
      .filter(Boolean)
      .slice(0, 6);
    if (tags.length) {
      const more = tagsRaw.length > tags.length ? " …" : "";
      parts.push(`Tags (${tagsRaw.length}): ${tags.join(", ")}${more}`);
    }
  }
  return parts.filter(Boolean).join("\n\n");
};

const expertScoutDetailForUi = (r: ExpertListingStepResponse): string => {
  const t = r.thought?.trim();
  if (t) return clipExpertDetail(t);
  const fromData = buildScoutDetailFromData(r.data ?? {});
  if (fromData.trim()) return clipExpertDetail(fromData.trim());
  return "(kein Gedankentext)";
};

const expertEditorDetailForUi = (r: ExpertListingStepResponse): string => {
  const t = r.thought?.trim();
  if (t) return clipExpertDetail(t);
  const titles = r.listing?.titles;
  const first = Array.isArray(titles) && titles.length > 0 ? String(titles[0]).trim() : "";
  if (first) return clipExpertDetail(first);
  return "(kein Abschluss-Statement)";
};

const isAbortError = (e: unknown): boolean =>
  (typeof DOMException !== "undefined" &&
    e instanceof DOMException &&
    e.name === "AbortError") ||
  (e instanceof Error && e.name === "AbortError");

type Props = {
  templates: GelatoTemplate[];
  artworks: ArtworkItem[];
  onClose: () => void;
  onExport: (
    gelatoTemplateId: number,
    metadataList: ArtworkMetadata[],
    freeShipping: boolean,
    downloadZip: boolean,
  ) => void;
};

export const GelatoExportModal = ({
  templates,
  artworks,
  onClose,
  onExport,
}: Props) => {
  const [step, setStep] = useState<1 | 2>(1);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id?.toString() ?? "",
  );
  const [downloadZip, setDownloadZip] = useState(true);

  const [metadataList, setMetadataList] = useState<ArtworkMetadata[]>(() =>
    artworks.map((a) => ({ title: a.name, description: "", tags: "" })),
  );

  // AI context (applies to all artworks in bulk mode)
  const [productType, setProductType] = useState("");
  const [aiContext, setAiContext] = useState("");

  // Single-artwork KI popup
  const [aiPopupIdx, setAiPopupIdx] = useState<number | null>(null);
  const [aiPopupProduct, setAiPopupProduct] = useState("");
  const [aiPopupContext, setAiPopupContext] = useState("");

  // Recent AI contexts
  const [recentContexts, setRecentContexts] = useState<string[]>(getRecentContexts);

  // AI state
  const [aiConnected, setAiConnected] = useState(false);
  const [aiLoadingIdx, setAiLoadingIdx] = useState<number | null>(null);
  const [aiBulkLoading, setAiBulkLoading] = useState(false);
  const [aiFailureHint, setAiFailureHint] = useState<string | null>(null);
  const [aiExpertMode, setAiExpertMode] = useState(false);
  const [aiExpertPhases, setAiExpertPhases] = useState<ExpertDebatePhase[]>(
    createInitialExpertPhases,
  );
  const [expertFallbackBanner, setExpertFallbackBanner] = useState<string | null>(null);
  const [expertStepLabel, setExpertStepLabel] = useState("");
  const expertAbortRef = useRef<AbortController | null>(null);

  const { gelato: gelatoIntegrationOk, loading: integrationFlagsLoading } =
    useIntegrationFlags();
  const goToIntegration = useAppStore((s) => s.goToIntegration);

  useEffect(() => {
    void fetchAiStatus()
      .then((s: AIConnectionStatus) => {
        setAiConnected(!!s.connected);
      })
      .catch(() => {
        setAiConnected(false);
      });
  }, []);

  useEffect(() => {
    const body = document.body;
    const prevOverflow = body.style.overflow;
    // Nur body sperren — overflow auf html bricht position:sticky am App-Header,
    // sodass die Leiste bei gescrollter Seite aus dem Viewport verschwindet.
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevOverflow;
    };
  }, []);

  const updateMeta = useCallback(
    (idx: number, field: keyof ArtworkMetadata, value: string) => {
      setMetadataList((prev) => {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], [field]: value };
        return copy;
      });
    },
    [],
  );

  const buildContext = useCallback(
    (product: string, context: string) => {
      const parts: string[] = [];
      if (product) parts.push(`Product type: ${product}`);
      if (context.trim()) parts.push(context.trim());
      return parts.join(". ");
    },
    [],
  );

  const openAiPopup = useCallback((idx: number) => {
    setAiPopupProduct(productType);
    setAiPopupContext(aiContext);
    setAiPopupIdx(idx);
    void fetchAiStatus()
      .then((s) => {
        setAiExpertMode(!!s.prefer_expert_mode);
      })
      .catch(() => {
        setAiExpertMode(false);
      });
  }, [productType, aiContext]);

  const applyListingToMeta = useCallback(
    (idx: number, listing: { titles: string[]; tags: string[]; description: string }) => {
      setMetadataList((prev) => {
        const copy = [...prev];
        copy[idx] = {
          title: listing.titles[0] ?? copy[idx].title,
          description: listing.description || copy[idx].description,
          tags: listing.tags.join(", ") || copy[idx].tags,
        };
        return copy;
      });
    },
    [],
  );

  const handleAiGenerateSingle = useCallback(async () => {
    if (aiPopupIdx === null) return;
    const art = artworks[aiPopupIdx];
    if (!art?.file) return;

    const idx = aiPopupIdx;

    let snap: AIConnectionStatus;
    try {
      snap = await fetchAiStatus();
    } catch {
      toast.error("KI-Status konnte nicht geladen werden.");
      return;
    }
    const expert = !!snap.prefer_expert_mode && aiExpertMode;

    if (!expert) {
      setAiPopupIdx(null);
    }
    setAiLoadingIdx(idx);
    setAiFailureHint(null);
    setExpertFallbackBanner(null);
    setExpertStepLabel("");

    const abort = new AbortController();
    expertAbortRef.current = abort;

    try {
      useAiActivityStore.getState().setPanelOpen(true);
      const ctx = buildContext(aiPopupProduct, aiPopupContext);
      if (aiPopupContext.trim()) {
        pushRecentContext(aiPopupContext.trim());
        setRecentContexts(getRecentContexts());
      }

      const pushAiLog = useAiActivityStore.getState().pushAiLog;
      if (snap.use_grounding) {
        pushAiLog({
          kind: "grounding",
          title: "Google Search Grounding aktiv",
          detail:
            "Echtzeit-Websuche ist für diese Anfrage eingeschaltet (KI-Einstellungen). Die API liefert keine Roh-Snippets; die KI nutzt Trends intern für Titel und Tags.",
        });
      }

      if (!expert) {
        pushAiLog({
          kind: "standard",
          title: `Listing: ${art.name}`,
          detail: "Ein Schritt — Gemini erzeugt Titel, 13 Tags und Beschreibung.",
        });
        const result = await generateListing(art.file, ctx, "all");
        applyListingToMeta(idx, result);
        pushAiLog({
          kind: "standard",
          title: `Fertig: ${art.name}`,
          detail: `Titel: ${result.titles[0]?.slice(0, 80) ?? "—"}…`,
        });
        toast.success(`KI-Daten für "${art.name}" generiert`);
        return;
      }

      pushAiLog({
        kind: "expert",
        title: `Expert-Modus: ${art.name}`,
        detail: "Ablauf: Trend-Scout → Kritiker → Editor (drei API-Schritte).",
      });

      setAiExpertPhases(createInitialExpertPhases());
      setExpertStepLabel("Schritt 1 von 3");

      const runPhase = (i: 0 | 1 | 2, status: ExpertDebatePhase["status"], thought?: string) => {
        setAiExpertPhases((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], status, ...(thought !== undefined ? { thought } : {}) };
          return next;
        });
      };

      runPhase(0, "running");
      const r1: ExpertListingStepResponse = await generateListingExpertStep(
        art.file,
        ctx,
        "all",
        1,
        { signal: abort.signal },
      );
      runPhase(0, "done", expertScoutDetailForUi(r1));
      pushAiLog({
        kind: "expert",
        title: "Agent 1 · Trend-Scout",
        detail: expertScoutDetailForUi(r1),
      });

      if (r1.fallback_used && r1.listing) {
        setExpertFallbackBanner(
          r1.warning ?? "Fallback: Scout-Entwurf wird als Listing übernommen.",
        );
        applyListingToMeta(idx, r1.listing);
        toast.success(`KI-Daten für "${art.name}" (Fallback)`);
        setAiPopupIdx(null);
        return;
      }

      setExpertStepLabel("Schritt 2 von 3");
      runPhase(1, "running");
      const r2 = await generateListingExpertStep(undefined, ctx, "all", 2, {
        scoutPayload: r1.data,
        signal: abort.signal,
      });
      runPhase(1, "done", expertCriticDetailForUi(r2));
      pushAiLog({
        kind: "expert",
        title: "Agent 2 · Kritiker",
        detail: expertCriticDetailForUi(r2),
      });

      if (r2.fallback_used && r2.listing) {
        setExpertFallbackBanner(
          r2.warning ?? "Schritt 2 fehlgeschlagen — Scout-Entwurf als Listing übernommen.",
        );
        pushAiLog({
          kind: "info",
          title: "Fallback nach Schritt 2",
          detail: r2.warning ?? "Nutze normalisierten Scout-Entwurf.",
        });
        applyListingToMeta(idx, r2.listing);
        toast.success(`KI-Daten für "${art.name}" (Fallback)`);
        setAiPopupIdx(null);
        return;
      }

      setExpertStepLabel("Schritt 3 von 3");
      runPhase(2, "running");
      const r3 = await generateListingExpertStep(undefined, ctx, "all", 3, {
        scoutPayload: r1.data,
        criticPayload: r2.data,
        signal: abort.signal,
      });
      runPhase(2, "done", expertEditorDetailForUi(r3));
      pushAiLog({
        kind: "expert",
        title: "Agent 3 · Editor",
        detail: expertEditorDetailForUi(r3),
      });

      if (r3.fallback_used && r3.listing) {
        setExpertFallbackBanner(
          r3.warning ?? "Schritt 3 fehlgeschlagen — Scout-Entwurf als Listing übernommen.",
        );
        pushAiLog({
          kind: "info",
          title: "Fallback nach Schritt 3",
          detail: r3.warning ?? "Nutze normalisierten Scout-Entwurf.",
        });
        applyListingToMeta(idx, r3.listing);
        toast.success(`KI-Daten für "${art.name}" (Fallback)`);
      } else if (r3.listing) {
        applyListingToMeta(idx, r3.listing);
        toast.success(`KI-Daten für "${art.name}" generiert (Expert)`);
      }
      setAiPopupIdx(null);
    } catch (e) {
      if (isAbortError(e)) {
        useAiActivityStore.getState().pushAiLog({
          kind: "info",
          title: "Generierung abgebrochen",
          detail: art.name,
        });
        toast.info("Generierung abgebrochen.");
        return;
      }
      const msg = getErrorMessage(e);
      const httpStatus = e instanceof ApiError ? e.status : undefined;
      setAiFailureHint(buildAiFailureHint(msg, httpStatus));
      toast.error(`KI-Fehler: ${msg}`);
    } finally {
      setAiLoadingIdx(null);
      expertAbortRef.current = null;
      setExpertStepLabel("");
    }
  }, [
    aiPopupIdx,
    artworks,
    aiPopupProduct,
    aiPopupContext,
    aiExpertMode,
    buildContext,
    applyListingToMeta,
  ]);

  const handleAiBulkGenerate = useCallback(async () => {
    setAiFailureHint(null);
    setAiBulkLoading(true);
    const ctx = buildContext(productType, aiContext);
    if (aiContext.trim()) {
      pushRecentContext(aiContext.trim());
      setRecentContexts(getRecentContexts());
    }
    let successCount = 0;
    let consecutiveFailures = 0;
    let styleRef = "";

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const artworksWithFile = artworks.filter((a) => a?.file).length;

    try {
      useAiActivityStore.getState().setPanelOpen(true);
      const bulkSnap = await fetchAiStatus();
      const expertBulk = !!bulkSnap.prefer_expert_mode;
      const pushAiLog = useAiActivityStore.getState().pushAiLog;

      pushAiLog({
        kind: expertBulk ? "expert" : "standard",
        title: `Bulk-KI: ${artworksWithFile} Motive`,
        detail: expertBulk
          ? bulkSnap.use_grounding
            ? "Expert (Multi-Agent): pro Motiv drei Schritte — Scout, Kritiker, Editor. Google Search Grounding aktiv."
            : "Expert (Multi-Agent): pro Motiv drei Schritte — Scout, Kritiker, Editor."
          : bulkSnap.use_grounding
            ? "Standard-Einzelprompt pro Motiv, Google Search Grounding aktiv."
            : "Standard-Einzelprompt pro Motiv.",
      });

      if (bulkSnap.use_grounding) {
        pushAiLog({
          kind: "grounding",
          title: "Google Search Grounding aktiv",
          detail:
            "Echtzeit-Websuche ist für diese Anfrage eingeschaltet (KI-Einstellungen). Die API liefert keine Roh-Snippets; die KI nutzt Trends intern für Titel und Tags.",
        });
      }

      for (let i = 0; i < artworks.length; i++) {
        const art = artworks[i];
        if (!art?.file) continue;

        if (successCount > 0) await delay(3000);

        setAiLoadingIdx(i);
        try {
          if (expertBulk) {
            pushAiLog({
              kind: "expert",
              title: `Expert-Modus: ${art.name}`,
              detail: "Ablauf: Trend-Scout → Kritiker → Editor (drei API-Schritte).",
            });

            const r1: ExpertListingStepResponse = await generateListingExpertStep(
              art.file,
              ctx,
              "all",
              1,
            );
            pushAiLog({
              kind: "expert",
              title: `${art.name} · Agent 1`,
              detail: expertScoutDetailForUi(r1),
            });

            let finalListing: AIListingResult | null = null;

            if (r1.fallback_used && r1.listing) {
              pushAiLog({
                kind: "info",
                title: `Fallback: ${art.name}`,
                detail: r1.warning ?? "Scout-Entwurf wird als Listing übernommen.",
              });
              finalListing = r1.listing;
            } else {
              const r2 = await generateListingExpertStep(undefined, ctx, "all", 2, {
                scoutPayload: r1.data,
              });
              pushAiLog({
                kind: "expert",
                title: `${art.name} · Agent 2`,
                detail: expertCriticDetailForUi(r2),
              });

              if (r2.fallback_used && r2.listing) {
                pushAiLog({
                  kind: "info",
                  title: `Fallback: ${art.name}`,
                  detail: r2.warning ?? "Schritt 2 fehlgeschlagen — Scout-Entwurf übernommen.",
                });
                finalListing = r2.listing;
              } else {
                const r3 = await generateListingExpertStep(undefined, ctx, "all", 3, {
                  scoutPayload: r1.data,
                  criticPayload: r2.data,
                });
                pushAiLog({
                  kind: "expert",
                  title: `${art.name} · Agent 3`,
                  detail: expertEditorDetailForUi(r3),
                });

                if (r3.fallback_used && r3.listing) {
                  pushAiLog({
                    kind: "info",
                    title: `Fallback: ${art.name}`,
                    detail: r3.warning ?? "Schritt 3 fehlgeschlagen — Scout-Entwurf übernommen.",
                  });
                  finalListing = r3.listing;
                } else if (r3.listing) {
                  finalListing = r3.listing;
                }
              }
            }

            if (!finalListing) {
              throw new Error("Expert-Listing lieferte kein Ergebnis");
            }

            applyListingToMeta(i, finalListing);
            pushAiLog({
              kind: "expert",
              title: `Fertig: ${art.name}`,
              detail: `Titel: ${finalListing.titles[0]?.slice(0, 80) ?? "—"}…`,
            });
          } else {
            const result = await generateListing(art.file, ctx, "all", styleRef);

            if (!styleRef && result.titles.length > 0 && result.description) {
              styleRef = JSON.stringify({
                titles: result.titles,
                tags: result.tags,
                description: result.description,
              });
            }

            setMetadataList((prev) => {
              const copy = [...prev];
              copy[i] = {
                title: result.titles[0] ?? copy[i].title,
                description: result.description || copy[i].description,
                tags: result.tags.join(", ") || copy[i].tags,
              };
              return copy;
            });
            pushAiLog({
              kind: "standard",
              title: `Fertig: ${art.name}`,
              detail: `Titel: ${result.titles[0]?.slice(0, 80) ?? "—"}…`,
            });
          }

          successCount++;
          consecutiveFailures = 0;
        } catch (e) {
          const msg = getErrorMessage(e);
          const httpStatus = e instanceof ApiError ? e.status : undefined;
          setAiFailureHint(buildAiFailureHint(msg, httpStatus));
          consecutiveFailures++;

          const unavailable = isServiceUnavailable(msg, httpStatus);

          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            toast.error(
              unavailable
                ? `KI-Dienst nicht erreichbar – Bulk-Generierung nach ${consecutiveFailures} Fehlern abgebrochen. Bitte später erneut versuchen oder Modell wechseln.`
                : `${consecutiveFailures} aufeinanderfolgende Fehler – Bulk-Generierung abgebrochen.`,
            );
            break;
          }

          toast.error(`KI-Fehler bei "${art.name}": ${msg}`);
          await delay(unavailable ? 15000 : 5000);
        }
      }
      if (successCount > 0) {
        toast.success(`${successCount} von ${artworksWithFile} Motiven per KI befüllt`);
      }
      if (successCount === artworksWithFile && artworksWithFile > 0) {
        setAiFailureHint(null);
      }
    } finally {
      setAiLoadingIdx(null);
      setAiBulkLoading(false);
    }
  }, [artworks, productType, aiContext, buildContext, applyListingToMeta]);

  const allTitlesFilled = metadataList.every((m) => m.title.trim().length > 0);
  const selectedTemplateName =
    templates.find((t) => t.id.toString() === selectedTemplateId)?.name ?? "";
  const isAiBusy = aiLoadingIdx !== null || aiBulkLoading;

  const handleSubmit = () => {
    if (!selectedTemplateId || !allTitlesFilled) return;
    onExport(Number(selectedTemplateId), metadataList, false, downloadZip);
  };

  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const toggleExpand = useCallback(
    (idx: number) => setExpandedIdx((prev) => (prev === idx ? null : idx)),
    [],
  );

  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [previewPos, setPreviewPos] = useState({ left: 0, top: 0 });
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const handlePreviewEnter = useCallback(
    (idx: number, e: React.MouseEvent) => {
      if (isMobile) return;
      setPreviewPos(clampPreviewPopoverPosition(e.clientX, e.clientY));
      setPreviewIdx(idx);
    },
    [isMobile],
  );
  const previewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePreviewLeave = useCallback(() => {
    previewTimeout.current = setTimeout(() => setPreviewIdx(null), 120);
  }, []);
  const handlePanelEnter = useCallback(() => {
    if (previewTimeout.current) {
      clearTimeout(previewTimeout.current);
      previewTimeout.current = null;
    }
  }, []);
  const handlePanelLeave = useCallback(() => {
    setPreviewIdx(null);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-hidden bg-black/50 px-3 pb-4 pt-[5.5rem] sm:px-5 sm:pb-6 sm:pt-24">
      <div
        className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-slate-900/5"
        style={{ maxHeight: "min(86vh, calc(100vh - 7rem))" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-500/20">
              <Globe size={20} aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Gelato Export</h2>
              <p className="text-sm text-slate-500">
                {step === 1
                  ? "Metadaten pro Motiv festlegen"
                  : "Zusammenfassung & Start"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Schließen"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — einziger Scrollbereich im Dialog (lange Motivliste) */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {!integrationFlagsLoading && !gelatoIntegrationOk ? (
            <IntegrationMissingCallout
              className="mb-4"
              title="Gelato ist nicht verbunden"
              description="Ohne API-Verbindung kann kein Export zu Gelato gestartet werden. Richte Gelato unter Integrationen ein."
              actionLabel="Gelato einrichten"
              onSetup={() => goToIntegration("gelato")}
            />
          ) : null}
          {step === 1 ? (
            <div className="space-y-4">
              {/* Template + Shipping */}
              <Select
                label="Gelato-Template"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                {templates.length === 0 ? (
                  <option value="" disabled>
                    Keine Templates synchronisiert
                  </option>
                ) : (
                  templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
                )}
              </Select>

              {!aiConnected ? (
                <IntegrationMissingCallout
                  variant="slate"
                  title="Gemini (KI) ist nicht verbunden"
                  description="Für automatische Listing-Texte brauchst du einen Gemini-API-Key. Du kannst Metadaten auch manuell eintragen."
                  actionLabel="Gemini einrichten"
                  onSetup={() => goToIntegration("gemini")}
                />
              ) : null}

              {/* AI bulk section */}
              {aiConnected && (
                <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-900/5">
                  <h3 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    <Sparkles size={14} className="text-indigo-600" aria-hidden /> KI für alle Motive
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Select
                      label="Produkttyp"
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                    >
                      {PRODUCT_TYPES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </Select>
                    <Input
                      label="KI-Kontext"
                      placeholder="z. B. minimalistisch, schwarzer Hintergrund…"
                      value={aiContext}
                      onChange={(e) => setAiContext(e.target.value)}
                    />
                  </div>
                  {recentContexts.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Clock size={12} className="shrink-0 text-slate-400" aria-hidden />
                      {recentContexts.map((ctx) => (
                        <button
                          key={ctx}
                          type="button"
                          onClick={() => setAiContext(ctx)}
                          className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 shadow-[0_1px_2px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/10 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                          {ctx.length > 30 ? `${ctx.slice(0, 28)}…` : ctx}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-3">
                    <Button
                      variant="ghost"
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                      onClick={handleAiBulkGenerate}
                      disabled={isAiBusy}
                    >
                      {aiBulkLoading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          KI generiert ({aiLoadingIdx !== null ? aiLoadingIdx + 1 : 0}/{artworks.length})…
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          KI für alle generieren
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {aiFailureHint && (
                <div
                  role="status"
                  className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-950 ring-1 ring-inset ring-amber-500/20"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                    aria-hidden
                  />
                  <p className="leading-snug">{aiFailureHint}</p>
                </div>
              )}

              {/* Per-artwork list */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Motive ({artworks.length})
                </h3>
                <div className="space-y-2">
                  {artworks.map((art, idx) => {
                    const isExpanded = expandedIdx === idx;
                    const hasMeta = !!(metadataList[idx]?.description || metadataList[idx]?.tags);
                    return (
                      <div
                        key={art.id}
                        className="relative rounded-lg bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 transition-shadow hover:shadow-sm"
                      >
                        {/* Compact header row */}
                        <button
                          type="button"
                          onClick={() => toggleExpand(idx)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                          aria-expanded={isExpanded}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-medium text-slate-500">
                            {idx + 1}
                          </span>
                          <ArtworkListThumbnail
                            previewUrl={art.previewUrl}
                            variant="light"
                            className="h-10 w-10 rounded border border-slate-200"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-700">
                              {metadataList[idx]?.title || art.name}
                            </p>
                            {hasMeta && !isExpanded && (
                              <p className="text-xs text-slate-400">
                                <span
                                  className="inline cursor-default transition-colors hover:text-slate-700"
                                  onMouseEnter={(e) => handlePreviewEnter(idx, e)}
                                  onMouseMove={(e) => {
                                    if (!isMobile && previewIdx === idx) {
                                      setPreviewPos(
                                        clampPreviewPopoverPosition(
                                          e.clientX,
                                          e.clientY,
                                        ),
                                      );
                                    }
                                  }}
                                  onMouseLeave={handlePreviewLeave}
                                >
                                  {metadataList[idx]?.tags
                                    ? `${metadataList[idx].tags.split(",").length} Tags`
                                    : ""}
                                  {metadataList[idx]?.tags && metadataList[idx]?.description ? " · " : ""}
                                  {metadataList[idx]?.description ? "Beschreibung vorhanden" : ""}
                                  {!isMobile && (
                                    <span className="ml-1 text-[10px] font-medium text-slate-500">↗ Vorschau</span>
                                  )}
                                </span>
                              </p>
                            )}
                          </div>
                          {aiLoadingIdx === idx && (
                            <Loader2 size={16} className="shrink-0 animate-spin text-indigo-500" />
                          )}
                          {aiConnected && aiLoadingIdx !== idx && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void openAiPopup(idx);
                              }}
                              disabled={isAiBusy}
                              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-[0_1px_2px_rgb(0,0,0,0.04)] ring-1 ring-inset ring-slate-900/5 transition-all duration-200 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 [&_svg]:text-indigo-600"
                              aria-label={`KI-Metadaten für ${art.name} generieren`}
                            >
                              <Sparkles size={14} />
                              KI
                            </button>
                          )}
                          {isExpanded
                            ? <ChevronUp size={16} className="shrink-0 text-indigo-600" aria-hidden />
                            : <ChevronDown size={16} className="shrink-0 text-indigo-600" aria-hidden />
                          }
                        </button>

                        {/* Expanded edit area */}
                        {isExpanded && (
                          <div className="space-y-3 border-t border-slate-100 px-3 pb-3 pt-3">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-500">Titel</label>
                              <input
                                type="text"
                                value={metadataList[idx]?.title ?? ""}
                                onChange={(e) => updateMeta(idx, "title", e.target.value)}
                                placeholder="Titel eingeben…"
                                className={cn(
                                  "w-full rounded-xl px-3 py-2 text-sm text-slate-800 shadow-[0_2px_8px_rgb(0,0,0,0.04)] outline-none transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10",
                                  !metadataList[idx]?.title?.trim()
                                    ? "bg-red-50/50 ring-1 ring-red-300"
                                    : "bg-white ring-1 ring-slate-900/5",
                                )}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-500">Beschreibung</label>
                              <textarea
                                value={metadataList[idx]?.description ?? ""}
                                onChange={(e) => updateMeta(idx, "description", e.target.value)}
                                placeholder="Produktbeschreibung…"
                                rows={5}
                                className="w-full resize-y rounded-xl bg-white px-3 py-2 text-sm text-slate-800 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 outline-none transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-500">Tags</label>
                              <input
                                type="text"
                                value={metadataList[idx]?.tags ?? ""}
                                onChange={(e) => updateMeta(idx, "tags", e.target.value)}
                                placeholder="tag1, tag2, tag3, …"
                                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-800 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 outline-none transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Step 2: Summary */
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-inset ring-slate-900/5">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Zusammenfassung
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Motive</dt>
                    <dd className="font-medium text-slate-900">{artworks.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Gelato-Template</dt>
                    <dd className="font-medium text-slate-900">{selectedTemplateName}</dd>
                  </div>
                </dl>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-900/5">
                <Truck size={16} className="shrink-0 text-slate-400" />
                <div>
                  <span className="text-sm font-medium text-slate-500">Versand</span>
                  <p className="text-xs text-slate-400">Wird im Gelato-Template festgelegt</p>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 p-4 ring-1 ring-inset ring-amber-500/25">
                <div className="flex items-start gap-3">
                  <Package size={18} className="mt-0.5 shrink-0 text-amber-600" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold">Produkte werden als Entwurf erstellt</p>
                    <p className="mt-0.5 text-amber-700">
                      Die Produkte erscheinen als Draft in deinem Gelato-Dashboard.
                      Du kannst sie dort prüfen und manuell veröffentlichen.
                    </p>
                  </div>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-white p-4 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 transition-colors hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={downloadZip}
                  onChange={(e) => setDownloadZip(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700">
                    Mockup-ZIP herunterladen
                  </span>
                  <p className="text-xs text-slate-500">
                    Parallel zum Gelato-Export wird eine ZIP mit allen Vorlagen pro Motiv
                    (Ordner pro Motiv) erzeugt und heruntergeladen — optional abschaltbar.
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-5 py-3">
          <div>
            {step === 2 && (
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Zurück
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Abbrechen
            </Button>
            {step === 1 ? (
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedTemplateId || !allTitlesFilled || templates.length === 0}
              >
                Weiter <ArrowRight size={16} />
              </Button>
            ) : (
              <Button onClick={handleSubmit}>
                <Check size={16} /> Export starten
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Hover preview panel – near cursor */}
      {previewIdx !== null && metadataList[previewIdx] && !isMobile && (
        <div
          className="fixed z-[205] w-80"
          style={{
            left: `${previewPos.left}px`,
            top: `${previewPos.top}px`,
          }}
          onMouseEnter={handlePanelEnter}
          onMouseLeave={handlePanelLeave}
        >
          <div
            className="flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-slate-900/5"
            style={{ maxHeight: "60vh" }}
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-3">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-50">
                <img
                  src={artworks[previewIdx]?.previewUrl ?? artworks[previewIdx]?.url}
                  className="h-full w-full object-cover"
                  alt=""
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">
                  {metadataList[previewIdx]?.title || artworks[previewIdx]?.name}
                </p>
                <p className="text-[10px] text-slate-400">Vorschau</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {metadataList[previewIdx]?.description && (
                <div className="mb-4">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Beschreibung
                  </p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                    {metadataList[previewIdx].description}
                  </p>
                </div>
              )}
              {metadataList[previewIdx]?.tags && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Tags ({metadataList[previewIdx].tags.split(",").length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {metadataList[previewIdx].tags.split(",").map((tag, ti) => (
                      <span
                        key={ti}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Single-artwork AI popup */}
      {aiPopupIdx !== null && artworks[aiPopupIdx] && (
        <div className="fixed inset-0 z-[210] flex items-start justify-center overflow-hidden bg-black/50 px-3 pb-4 pt-[5.5rem] sm:px-5 sm:pb-6 sm:pt-24">
          <div
            className={cn(
              "w-full overflow-y-auto overscroll-contain rounded-xl bg-white p-4 shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-slate-900/5 sm:p-5",
              aiExpertMode ? "max-w-lg" : "max-w-sm",
            )}
            style={{ maxHeight: "min(78vh, calc(100vh - 7rem))" }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-500/20">
                <Sparkles size={18} aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900">
                  KI-Generierung
                </h3>
                <p className="truncate text-xs text-slate-500">
                  {artworks[aiPopupIdx].name}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Select
                label="Produkttyp"
                value={aiPopupProduct}
                onChange={(e) => setAiPopupProduct(e.target.value)}
              >
                {PRODUCT_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
              <Input
                label="KI-Kontext"
                placeholder="z. B. Boho Stil, helles Holz…"
                value={aiPopupContext}
                onChange={(e) => setAiPopupContext(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAiGenerateSingle();
                }}
              />
              {recentContexts.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Clock size={12} className="shrink-0 text-slate-400" aria-hidden />
                  {recentContexts.map((ctx) => (
                    <button
                      key={ctx}
                      type="button"
                      onClick={() => setAiPopupContext(ctx)}
                      className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 shadow-[0_1px_2px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/10 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      {ctx.length > 30 ? `${ctx.slice(0, 28)}…` : ctx}
                    </button>
                  ))}
                </div>
              )}
              {aiConnected && (
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 text-left ring-1 ring-inset ring-slate-900/5">
                  <input
                    type="checkbox"
                    checked={aiExpertMode}
                    onChange={(e) => {
                      setAiExpertMode(e.target.checked);
                      setExpertFallbackBanner(null);
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs leading-snug text-slate-700">
                    <span className="font-medium">Expert-Modus (Multi-Agent)</span>
                    <span className="mt-0.5 block text-slate-500">
                      Trend-Scout, Kritiker und Editor nacheinander — War Room hier, Verlauf unten links
                      unter „KI Logbuch“. Standard kommt aus{" "}
                      <span className="font-medium text-slate-600">Integrationen → Gemini (KI)</span>{" "}
                      (Multi-Agent Listing).
                    </span>
                  </span>
                </label>
              )}
            </div>

            {aiExpertMode &&
              aiLoadingIdx === aiPopupIdx &&
              aiPopupIdx !== null && (
                <ExpertDebateConsole
                  phases={aiExpertPhases}
                  fallbackBanner={expertFallbackBanner}
                  currentStepLabel={expertStepLabel}
                />
              )}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  expertAbortRef.current?.abort();
                  setAiPopupIdx(null);
                  setAiLoadingIdx(null);
                  setExpertStepLabel("");
                  setExpertFallbackBanner(null);
                }}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleAiGenerateSingle}
                disabled={aiPopupIdx !== null && aiLoadingIdx === aiPopupIdx}
              >
                {aiLoadingIdx === aiPopupIdx ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Bitte warten …
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Generieren
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
