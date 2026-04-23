import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Loader2,
  Plus,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { fetchAiStatus } from "../../api/ai";
import type {
  CompanionCatalog,
  CompanionModelEntry,
} from "../../api/companion";
import type { UpscaleTotalFactor } from "../../api/upscaler";
import {
  upscaleImage,
  UpscaleVertexApiNotEnabledError,
} from "../../api/upscaler";
import { ApiError, refreshAccessToken } from "../../api/client";
import { useCompanionBatchTileEta } from "../../hooks/useCompanionBatchTileEta";
import {
  EXPECTED_ENGINE_VERSION,
  type ParallelTilesOption,
  useCompanionApp,
} from "../../hooks/useCompanionApp";
import { useWorkSessionEta } from "../../hooks/useWorkSessionEta";
import type { CompanionTileProgressReady } from "../../lib/companion/companionTileProgress";
import { cn } from "../../lib/ui/cn";
import { getCompanionUvicornClipboardText } from "../../lib/companion/companionDevStartCommand";
import { triggerAnchorDownload } from "../../lib/common/download";
import { getErrorMessage } from "../../lib/common/error";
import {
  filterRasterImageFiles,
  MAX_UPSCALER_IMAGE_BYTES,
  RASTER_IMAGE_ACCEPT_HTML,
} from "../../lib/generator/imageUploadAccept";
import { PRINTFLOW_LOCAL_STACK_ENABLED } from "../../lib/companion/companionConstants";
import {
  PRINTFLOW_ENGINE_DOWNLOAD_HREF,
  PRINTFLOW_ENGINE_EXE_FILENAME,
} from "../../lib/companion/localEngine";
import {
  WORKSPACE_PANEL_TITLE,
  workspaceEmbeddedPanelClassName,
} from "../../lib/ui/workspaceSurfaces";
import {
  formatReplicateSessionEta,
  maxReplicateParallelWorkers,
} from "../../lib/upscaler/replicateTileParallel";
import { formatUpscaleUserMessage } from "../../lib/upscaler/upscaleUserMessage";
import { toast } from "../../lib/ui/toast";
import { useAppStore } from "../../store/appStore";
import { AppPage } from "../ui/layout/AppPage";
import { Button } from "../ui/primitives/Button";
import { Select } from "../ui/primitives/Select";
import { IntegrationMissingCallout } from "../ui/patterns/IntegrationMissingCallout";
import { LoadingOverlay } from "../ui/LoadingOverlay";
import { UploadQueueInitialDropzone } from "../ui/patterns/UploadQueueGrid";
import { WorkspacePanelCard } from "../ui/layout/WorkspacePanelCard";
import { WorkSessionShell } from "../ui/workSession/WorkSessionShell";
import { UpscalerQueueTable } from "./UpscalerQueueTable";

/**
 * Replicate im Upscaler: Karte bleibt sichtbar, ist aber nicht wählbar.
 * Auf `true` setzen, wenn Replicate wieder angeboten werden soll.
 */
const UPSCALER_REPLICATE_SELECTABLE = false;

/** Cloud (Replicate): konservativ wegen API-Kosten/Quota. */
const MAX_BATCH_FILES_CLOUD = 15;
/** PrintFlow Engine (lokal): mehr Motive pro Durchgang. */
const MAX_BATCH_FILES_LOCAL = 50;

type UpscalerEngineMode = "vertex" | "replicate" | "local";

const labelForEngineMode = (m: UpscalerEngineMode) =>
  m === "vertex"
    ? "Vertex (Cloud)"
    : m === "replicate"
      ? "Replicate (Cloud)"
      : "PrintFlow Engine (lokal)";

type ItemStatus = "pending" | "running" | "done" | "error" | "cancelled";

type BatchItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: ItemStatus;
  originalWidth?: number;
  originalHeight?: number;
  resultUrl?: string;
  resultBlob?: Blob;
  upscaledWidth?: number;
  upscaledHeight?: number;
  errorMessage?: string;
};

/** Faktor-Segmentkontrolle (Mockup: 2× / 4× / 8×). */
const UPSCALE_FACTOR_UI_OPTIONS: readonly UpscaleTotalFactor[] = [2, 4, 8];

const nextId = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const safeZipBaseName = (name: string, index: number): string => {
  const base = name.replace(/\.[^/.]+$/, "") || `bild_${index + 1}`;
  return base.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 120);
};

const JS_STORE = { compression: "STORE" as const };

const yieldToMain = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

const isAbortError = (e: unknown): boolean =>
  (e instanceof DOMException && e.name === "AbortError") ||
  (e instanceof Error && e.name === "AbortError");

export const UpscalerView = () => {
  const activeTab = useAppStore((s) => s.activeTab);
  const workspaceTab = useAppStore((s) => s.workspaceTab);
  const goToIntegration = useAppStore((s) => s.goToIntegration);
  const setEditingSetId = useAppStore((s) => s.setEditingSetId);
  const setNavigationLocked = useAppStore((s) => s.setNavigationLocked);
  const openConfirm = useAppStore((s) => s.openConfirm);

  const { recordSample, reset: resetEta, getRemainingLabel } = useWorkSessionEta();
  const {
    resetBatch: resetCompanionTileEta,
    beginImage: beginCompanionTileImage,
    consumeSnapshot: consumeCompanionTileSnapshot,
    onImageFinished: finishCompanionTileImage,
    formatLine: formatCompanionTileLine,
  } = useCompanionBatchTileEta();
  const [sessionEtaLabel, setSessionEtaLabel] = useState<string | null>(null);
  const cancelRequestedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const newJobFileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<BatchItem[]>([]);
  const [factor, setFactor] = useState<UpscaleTotalFactor>(4);
  const [vertexUpscaleReady, setVertexUpscaleReady] = useState<boolean | null>(
    null,
  );
  const [replicateUpscaleReady, setReplicateUpscaleReady] = useState<
    boolean | null
  >(null);
  const [vertexApiGate, setVertexApiGate] = useState<string | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  /** Nach dem Lauf: Einzelbild = Vorher/Nachher; mehrere = nur Textliste + ZIP. */
  const [showResults, setShowResults] = useState(false);
  const [progressIdx, setProgressIdx] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  const [engineMode, setEngineMode] = useState<UpscalerEngineMode>("vertex");
  /** Erst Engine wählen (Vollbild), dann erscheint Dropzone + Einstellungen. */
  const [engineChoiceConfirmed, setEngineChoiceConfirmed] = useState(false);
  const [parallelTiles, setParallelTiles] =
    useState<ParallelTilesOption>("auto");

  useEffect(() => {
    if (!PRINTFLOW_LOCAL_STACK_ENABLED) {
      setEngineMode((m) => (m === "local" ? "vertex" : m));
    }
  }, []);

  useEffect(() => {
    if (!UPSCALER_REPLICATE_SELECTABLE) {
      setEngineMode((m) => (m === "replicate" ? "vertex" : m));
    }
  }, []);

  const isCloudEngine =
    engineMode === "vertex" || engineMode === "replicate";
  const selectedCloudReady =
    engineMode === "vertex"
      ? vertexUpscaleReady
      : engineMode === "replicate"
        ? replicateUpscaleReady
        : null;

  /** Einstellungen für PrintFlow Engine (lokal) — Standard eingeklappt. */
  const [localCompanionOpen, setLocalCompanionOpen] = useState(false);
  const [installingModelId, setInstallingModelId] = useState<string | null>(
    null,
  );
  const [uninstallingModelId, setUninstallingModelId] = useState<string | null>(
    null,
  );

  const {
    isOnline,
    isChecking,
    isOutdated,
    engineVersion,
    catalog,
    installedModelIds,
    activeModelId,
    vulkanRuntimeInstalled,
    installModelById,
    selectActiveModel,
    uninstallModelById,
    uninstallVulkanRuntime,
    upscaleWithCompanion,
  } = useCompanionApp({ enabled: PRINTFLOW_LOCAL_STACK_ENABLED });

  const canRunLocalUpscale = useMemo(() => {
    return (
      isOnline &&
      !isOutdated &&
      vulkanRuntimeInstalled &&
      activeModelId != null &&
      installedModelIds.includes(activeModelId)
    );
  }, [
    isOnline,
    isOutdated,
    vulkanRuntimeInstalled,
    activeModelId,
    installedModelIds,
  ]);

  const [isBuildingZip, setIsBuildingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState({
    current: 0,
    total: 1,
    message: "",
    packPercent: null as number | null,
  });

  const itemsRef = useRef(items);
  itemsRef.current = items;

  /** Nach einem erfolgreichen Lauf soll einmal ZIP automatisch starten (State ist danach committed). */
  const pendingAutoZipRef = useRef(false);

  const revokeAllUrls = useCallback((list: BatchItem[]) => {
    for (const it of list) {
      URL.revokeObjectURL(it.previewUrl);
      if (it.resultUrl) URL.revokeObjectURL(it.resultUrl);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "workspace" || workspaceTab !== "upscaler") return;
    void (async () => {
      try {
        const s = await fetchAiStatus();
        setVertexUpscaleReady(!!s.vertex_upscaler_configured);
        setReplicateUpscaleReady(!!s.replicate_upscale_configured);
      } catch {
        setVertexUpscaleReady(false);
        setReplicateUpscaleReady(false);
      }
    })();
  }, [activeTab, workspaceTab]);

  useEffect(
    () => () => {
      revokeAllUrls(itemsRef.current);
    },
    [revokeAllUrls],
  );

  useEffect(() => {
    if (!isBuildingZip) return;
    setNavigationLocked(true);
    return () => setNavigationLocked(false);
  }, [isBuildingZip, setNavigationLocked]);

  const handlePickFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    pendingAutoZipRef.current = false;
    setGenericError(null);
    setVertexApiGate(null);

    const picked = filterRasterImageFiles(files, {
      maxBytes: MAX_UPSCALER_IMAGE_BYTES,
    });

    if (picked.length === 0) {
      setGenericError(
        "Keine gueltigen Bilder (JPG, PNG, WebP, je max. 10 MB).",
      );
      return;
    }

    const maxBatch =
      engineMode === "local" ? MAX_BATCH_FILES_LOCAL : MAX_BATCH_FILES_CLOUD;

    setItems((prev) => {
      const remaining = maxBatch - prev.length;
      if (remaining <= 0) {
        const scopeLabel =
          engineMode === "local"
            ? "lokal"
            : engineMode === "vertex"
              ? "Vertex"
              : "Replicate";
        toast.error(
          `Maximal ${maxBatch} Dateien pro Durchgang (${scopeLabel}).`,
        );
        return prev;
      }

      let batch = picked;
      if (picked.length > remaining) {
        toast.error(
          `Nur noch ${remaining} Platz — es werden nur die ersten ${remaining} neuen Dateien übernommen.`,
        );
        batch = picked.slice(0, remaining);
      }

      const newItems: BatchItem[] = batch.map((file) => ({
        id: nextId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "pending" as const,
      }));
      for (const it of newItems) {
        const img = new Image();
        img.onload = () => {
          setItems((list) =>
            list.map((row) =>
              row.id === it.id
                ? {
                    ...row,
                    originalWidth: img.naturalWidth,
                    originalHeight: img.naturalHeight,
                  }
                : row,
            ),
          );
        };
        img.src = it.previewUrl;
      }
      return [...prev, ...newItems];
    });
    setShowResults(false);
  }, [engineMode]);

  const handleClearSelection = useCallback(() => {
    pendingAutoZipRef.current = false;
    setItems((prev) => {
      revokeAllUrls(prev);
      return [];
    });
    setGenericError(null);
    setVertexApiGate(null);
    setShowResults(false);
  }, [revokeAllUrls]);

  const handleRemoveQueueItem = useCallback((id: string) => {
    pendingAutoZipRef.current = false;
    setItems((prev) => {
      const it = prev.find((row) => row.id === id);
      if (!it) return prev;
      URL.revokeObjectURL(it.previewUrl);
      if (it.resultUrl) URL.revokeObjectURL(it.resultUrl);
      return prev.filter((row) => row.id !== id);
    });
    setShowResults(false);
  }, []);

  const buildZipFromDoneList = useCallback(async (done: BatchItem[]) => {
    if (!done.length) return;
    setIsBuildingZip(true);
    setZipProgress({
      current: 0,
      total: done.length,
      message: "ZIP wird zusammengestellt …",
      packPercent: null,
    });

    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (let index = 0; index < done.length; index++) {
        const it = done[index]!;
        const name = `${safeZipBaseName(it.file.name, index)}_upscaled.png`;
        zip.file(name, it.resultBlob!, JS_STORE);
        setZipProgress({
          current: index + 1,
          total: done.length,
          message: `Dateien ${index + 1}/${done.length} …`,
          packPercent: null,
        });
        await yieldToMain();
      }

      setZipProgress({
        current: done.length,
        total: done.length,
        message: "ZIP wird gepackt …",
        packPercent: 0,
      });

      const blob = await zip.generateAsync({ type: "blob" }, (meta) => {
        if (meta.percent != null) {
          setZipProgress((prev) => ({
            ...prev,
            packPercent: meta.percent,
            message: `ZIP wird gepackt … ${Math.round(meta.percent)}%`,
          }));
        }
      });

      triggerAnchorDownload(blob, `upscaled_batch_${Date.now()}.zip`);
      toast.success("ZIP heruntergeladen.");
    } catch (e) {
      console.error(e);
      toast.error(`ZIP fehlgeschlagen: ${getErrorMessage(e)}`);
    } finally {
      setIsBuildingZip(false);
      setZipProgress({
        current: 0,
        total: 1,
        message: "",
        packPercent: null,
      });
    }
  }, []);

  const handleDownloadZip = useCallback(async () => {
    const done = items.filter((it) => it.status === "done" && it.resultBlob);
    if (!done.length) {
      toast.error("Keine fertigen Bilder fuer den ZIP-Download.");
      return;
    }
    await buildZipFromDoneList(done);
  }, [items, buildZipFromDoneList]);

  const handleAbortUpscale = useCallback(async () => {
    const ok = await openConfirm(
      "Wirklich abbrechen? Bereits fertige Bilder werden als ZIP angeboten, der Rest wird nicht mehr verarbeitet.",
    );
    if (!ok) return;
    cancelRequestedRef.current = true;
    abortControllerRef.current?.abort();
  }, [openConfirm]);

  const handleInstallCompanionModel = useCallback(
    async (modelId: string) => {
      setInstallingModelId(modelId);
      try {
        await installModelById(modelId);
        toast.success("Modell installiert.");
      } catch (e) {
        console.error(e);
        toast.error(`Installation fehlgeschlagen: ${getErrorMessage(e)}`);
      } finally {
        setInstallingModelId(null);
      }
    },
    [installModelById],
  );

  const handleSelectCompanionActiveModel = useCallback(
    async (modelId: string) => {
      try {
        await selectActiveModel(modelId);
      } catch (e) {
        console.error(e);
        toast.error(`Aktives Modell: ${getErrorMessage(e)}`);
      }
    },
    [selectActiveModel],
  );

  const handleUninstallCompanionModel = useCallback(
    async (modelId: string) => {
      const ok = await openConfirm(
        "Modell-Dateien von diesem PC entfernen? Die Vulkan-EXE kann getrennt entfernt werden (Unten).",
      );
      if (!ok) return;
      setUninstallingModelId(modelId);
      try {
        await uninstallModelById(modelId);
        toast.success("Modell entfernt.");
      } catch (e) {
        console.error(e);
        toast.error(`Deinstallation fehlgeschlagen: ${getErrorMessage(e)}`);
      } finally {
        setUninstallingModelId(null);
      }
    },
    [openConfirm, uninstallModelById],
  );

  const handleUninstallVulkanRuntime = useCallback(async () => {
    const ok = await openConfirm(
      "realesrgan-ncnn-vulkan.exe und vcomp-DLLs aus dem PrintFlow-Engine-Ordner loeschen? Modell-Dateien unter models/ bleiben — danach erneut „Installieren“, um die EXE zurueckzuholen.",
    );
    if (!ok) return;
    try {
      await uninstallVulkanRuntime();
      toast.success("Real-ESRGAN-Programmdateien entfernt.");
    } catch (e) {
      console.error(e);
      toast.error(getErrorMessage(e));
    }
  }, [openConfirm, uninstallVulkanRuntime]);

  const handleBatchUpscale = useCallback(async () => {
    if (!items.length || isProcessing) return;

    if (engineMode === "local") {
      if (!isOnline) {
        toast.error(
          "PrintFlow Engine nicht erreichbar. Bitte die Desktop-App starten (Tray-Symbol).",
        );
        return;
      }
      if (isOutdated) {
        toast.error(
          "PrintFlow Engine veraltet. Bitte die aktuelle PrintFlowEngine.exe laden, ersetzen und die App neu starten.",
        );
        return;
      }
      if (
        !activeModelId ||
        !installedModelIds.includes(activeModelId)
      ) {
        toast.error(
          "Bitte mindestens ein Modell installieren und als aktiv waehlen.",
        );
        return;
      }
      if (!vulkanRuntimeInstalled) {
        toast.error(
          "realesrgan-ncnn-vulkan.exe fehlt. Unter Lokale Modelle erneut „Installieren“ (entpackt EXE + DLLs), oder EXE manuell nach companion_app/.",
        );
        return;
      }
    } else if (engineMode === "vertex" && vertexUpscaleReady !== true) {
      toast.error(
        "Vertex: Bitte in der KI-Integration ein Service-Account-.json hinterlegen.",
      );
      return;
    } else if (engineMode === "replicate" && replicateUpscaleReady !== true) {
      toast.error(
        "Replicate ist auf dem Server nicht konfiguriert (REPLICATE_API_TOKEN).",
      );
      return;
    }

    setGenericError(null);
    setVertexApiGate(null);

    const todo = items
      .map((it, idx) => ({ it, idx }))
      .filter(
        ({ it }) =>
          it.status === "pending" ||
          it.status === "error" ||
          it.status === "done",
      );

    if (todo.length === 0) {
      toast.error("Keine Bilder zum Hochskalieren — bitte neue Bilder hinzufuegen.");
      return;
    }

    const upscaleParams = { kind: "factor" as const, factor };

    setIsProcessing(true);
    setNavigationLocked(true);

    let anySuccess = false;
    let successInThisRun = 0;
    let finishedNormally = false;
    let vertexAborted = false;

    try {
      if (isCloudEngine) {
        const tokenOk = await refreshAccessToken();
        if (!tokenOk) {
          toast.error(
            "Sitzung konnte nicht erneuert werden. Bitte erneut anmelden und den Upscaler noch einmal starten.",
          );
          return;
        }
      }

      cancelRequestedRef.current = false;
      resetEta();
      if (engineMode === "local") {
        resetCompanionTileEta();
      }
      {
        const first = todo[0]?.it;
        if (
          engineMode === "replicate" &&
          first &&
          first.originalWidth &&
          first.originalHeight
        ) {
          const p = maxReplicateParallelWorkers(
            first.originalWidth,
            first.originalHeight,
            factor,
          );
          setSessionEtaLabel(
            formatReplicateSessionEta(
              p,
              getRemainingLabel(todo.length),
            ),
          );
        } else {
          setSessionEtaLabel(getRemainingLabel(todo.length));
        }
      }
      setProgressTotal(todo.length);
      setProgressIdx(0);

      for (let i = 0; i < todo.length; i++) {
        const { it, idx } = todo[i]!;
        setProgressIdx(i + 1);
        if (engineMode === "local") {
          beginCompanionTileImage();
          setSessionEtaLabel("Restzeit wird geschätzt …");
        } else if (engineMode === "replicate") {
          const ow = it.originalWidth;
          const oh = it.originalHeight;
          const rest = getRemainingLabel(Math.max(0, todo.length - i));
          if (ow && oh) {
            setSessionEtaLabel(
              formatReplicateSessionEta(
                maxReplicateParallelWorkers(ow, oh, factor),
                rest,
              ),
            );
          } else {
            setSessionEtaLabel(
              formatReplicateSessionEta(8, rest),
            );
          }
        } else {
          setSessionEtaLabel(getRemainingLabel(Math.max(0, todo.length - i)));
        }

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        setItems((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx]!, status: "running" };
          return next;
        });

        const t0 = performance.now();
        let lastTileSnap: CompanionTileProgressReady | null = null;

        try {
          const result =
            engineMode === "local"
              ? await upscaleWithCompanion(it.file, upscaleParams, {
                  signal,
                  modelId: activeModelId ?? undefined,
                  parallelTiles,
                  onTileProgress: (snap) => {
                    lastTileSnap = snap;
                    consumeCompanionTileSnapshot(snap);
                    setSessionEtaLabel(
                      formatCompanionTileLine(snap, i, todo.length),
                    );
                  },
                })
              : await upscaleImage(it.file, upscaleParams, {
                  signal,
                  cloudEngine:
                    engineMode === "replicate" ? "replicate" : "vertex",
                });
          const elapsed = performance.now() - t0;
          recordSample(elapsed);
          if (engineMode === "local" && lastTileSnap) {
            finishCompanionTileImage(lastTileSnap);
          }

          const resultUrl = URL.createObjectURL(result.blob);
          anySuccess = true;
          successInThisRun += 1;

          setItems((prev) => {
            const next = [...prev];
            const cur = next[idx]!;
            if (cur.resultUrl) URL.revokeObjectURL(cur.resultUrl);
            next[idx] = {
              ...cur,
              status: "done",
              originalWidth: result.originalWidth || cur.originalWidth,
              originalHeight: result.originalHeight || cur.originalHeight,
              resultUrl,
              resultBlob: result.blob,
              upscaledWidth: result.upscaledWidth,
              upscaledHeight: result.upscaledHeight,
              errorMessage: undefined,
            };
            return next;
          });
        } catch (e) {
          if (isAbortError(e) && cancelRequestedRef.current) {
            setItems((prev) => {
              const next = [...prev];
              for (let k = i; k < todo.length; k++) {
                const listIdx = todo[k]!.idx;
                const row = next[listIdx]!;
                if (row.status === "running" || row.status === "pending") {
                  if (row.resultUrl) URL.revokeObjectURL(row.resultUrl);
                  next[listIdx] = {
                    ...row,
                    status: "cancelled",
                    errorMessage: "Abgebrochen",
                    resultUrl: undefined,
                    resultBlob: undefined,
                  };
                }
              }
              return next;
            });
            break;
          }

          if (
            e instanceof UpscaleVertexApiNotEnabledError &&
            engineMode === "vertex"
          ) {
            vertexAborted = true;
            setVertexApiGate(e.activationUrl);
            setItems((prev) => {
              const next = [...prev];
              const cur = next[idx]!;
              next[idx] = {
                ...cur,
                status: "error",
                errorMessage: e.message,
              };
              return next;
            });
            break;
          }

          const raw =
            e instanceof ApiError ? e.getDetail() : getErrorMessage(e);
          const msg = formatUpscaleUserMessage(raw);
          setItems((prev) => {
            const next = [...prev];
            next[idx] = {
              ...next[idx]!,
              status: "error",
              errorMessage: msg,
            };
            return next;
          });
          toast.error(`Fehler bei ${it.file.name}: ${msg}`);
        }
      }

      finishedNormally = !vertexAborted && !cancelRequestedRef.current;

      if (cancelRequestedRef.current && anySuccess) {
        setIsProcessing(false);
        setSessionEtaLabel(null);
        await yieldToMain();
        const done = itemsRef.current.filter(
          (row) => row.status === "done" && row.resultBlob,
        );
        if (done.length) await buildZipFromDoneList(done);
        setShowResults(true);
        toast.success("Vorgang abgebrochen — ZIP mit fertigen Bildern wurde erstellt.");
      } else if (anySuccess && finishedNormally) {
        pendingAutoZipRef.current = true;
        setShowResults(true);
        if (vertexAborted) {
          toast.error(
            "Vertex API nicht aktiv — nach Aktivierung erneut versuchen. Fertige Bilder ggf. oben prüfen.",
          );
        } else if (todo.length > 1) {
          const failedInRun = todo.length - successInThisRun;
          if (failedInRun > 0) {
            toast.success(
              `Fertig: ${successInThisRun} von ${todo.length} — fehlgeschlagene kannst du erneut versuchen.`,
            );
          } else {
            toast.success("Alle Bilder verarbeitet.");
          }
        } else {
          toast.success("Bild fertig.");
        }
      } else if (!vertexAborted && !cancelRequestedRef.current) {
        toast.error("Kein Bild konnte verarbeitet werden.");
      }
    } finally {
      setIsProcessing(false);
      setNavigationLocked(false);
      abortControllerRef.current = null;
      setSessionEtaLabel(null);
    }
  }, [
    items,
    factor,
    isProcessing,
    engineMode,
    isCloudEngine,
    vertexUpscaleReady,
    replicateUpscaleReady,
    isOnline,
    isOutdated,
    vulkanRuntimeInstalled,
    activeModelId,
    installedModelIds,
    parallelTiles,
    upscaleWithCompanion,
    resetEta,
    getRemainingLabel,
    recordSample,
    buildZipFromDoneList,
    setNavigationLocked,
    resetCompanionTileEta,
    beginCompanionTileImage,
    consumeCompanionTileSnapshot,
    finishCompanionTileImage,
    formatCompanionTileLine,
  ]);

  useEffect(() => {
    if (isProcessing || !showResults || !pendingAutoZipRef.current) return;
    const done = items.filter(
      (it) => it.status === "done" && it.resultBlob,
    );
    if (done.length === 0) return;
    pendingAutoZipRef.current = false;
    void handleDownloadZip();
  }, [isProcessing, showResults, items, handleDownloadZip]);

  const handleDownloadSinglePng = useCallback((it: BatchItem) => {
    if (!it.resultUrl) return;
    const a = document.createElement("a");
    a.href = it.resultUrl;
    a.download = `${safeZipBaseName(it.file.name, 0)}_upscaled.png`;
    a.click();
    toast.success("Bild heruntergeladen.");
  }, []);

  /** Ausstehend, fehlgeschlagen oder fertig (erneuter Lauf mit anderem Faktor / gleicher Queue). */
  const upscaleQueueCount = useMemo(
    () =>
      items.filter(
        (i) =>
          i.status === "pending" ||
          i.status === "error" ||
          i.status === "done",
      ).length,
    [items],
  );

  const doneCount = useMemo(
    () => items.filter((i) => i.status === "done").length,
    [items],
  );

  const singlePreviewItem = useMemo((): BatchItem | null => {
    if (items.length !== 1) return null;
    const it = items[0]!;
    if (
      it.status !== "done" ||
      !it.resultUrl ||
      !it.previewUrl
    ) {
      return null;
    }
    return it;
  }, [items]);

  const runningItem = useMemo(
    () => items.find((i) => i.status === "running"),
    [items],
  );

  const queueSubtitle = useMemo(() => {
    const jobCountLabel = `${items.length} Job${items.length === 1 ? "" : "s"}`;
    if (engineMode === "vertex") {
      return `Vertex AI — dein BYOK-Key · ${jobCountLabel}`;
    }
    if (engineMode === "replicate") {
      return `Replicate (Cloud) · ${jobCountLabel}`;
    }
    return `PrintFlow Engine (lokal) · ${jobCountLabel}`;
  }, [items.length, engineMode]);

  // ── Leer, noch keine Engine: nur große Auswahl (keine Dropzone) ──
  if (items.length === 0 && !engineChoiceConfirmed) {
    return (
      <AppPage>
        <div className="space-y-4">
          <h1 className="sr-only">KI Upscaler</h1>
          <div className="w-full min-w-0">
            <div className="mx-auto w-full max-w-5xl rounded-[length:var(--pf-radius-lg)] border border-[color:var(--pf-border)] bg-[color:var(--pf-bg-elevated)] p-5 shadow-[var(--pf-shadow-sm)] sm:p-8 lg:min-h-[min(32rem,70dvh)] lg:px-10 lg:py-12">
              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Schritt 1
              </p>
              <h2 className="mt-1 text-balance text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Wo soll skaliert werden?
              </h2>
              <p className="mt-2 text-balance text-center text-sm font-medium text-slate-600">
                Tippen, um Einstellungen und Dropzone zu öffnen.
              </p>
              <fieldset className="mt-8 min-w-0">
                <legend className="sr-only">Upscaling-Engine wählen</legend>
                <div
                  className={cn(
                    "grid auto-rows-fr gap-4",
                    PRINTFLOW_LOCAL_STACK_ENABLED
                      ? "sm:grid-cols-2 lg:grid-cols-3"
                      : "sm:grid-cols-2",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setEngineMode("vertex");
                      setEngineChoiceConfirmed(true);
                    }}
                    className="flex min-h-[9.5rem] flex-col justify-between rounded-2xl bg-white p-6 text-left shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 transition-all hover:ring-indigo-500/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:p-7"
                  >
                    <p className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                      Vertex (Cloud)
                    </p>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
                      Imagen, eigenes GCP-Konto (BYOK)
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={!UPSCALER_REPLICATE_SELECTABLE}
                    title={
                      UPSCALER_REPLICATE_SELECTABLE
                        ? undefined
                        : "Replicate ist im Upscaler vorübergehend deaktiviert."
                    }
                    aria-disabled={!UPSCALER_REPLICATE_SELECTABLE}
                    onClick={() => {
                      if (!UPSCALER_REPLICATE_SELECTABLE) return;
                      setEngineMode("replicate");
                      setEngineChoiceConfirmed(true);
                    }}
                    className={cn(
                      "flex min-h-[9.5rem] flex-col justify-between rounded-2xl p-6 text-left sm:p-7",
                      UPSCALER_REPLICATE_SELECTABLE
                        ? "bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 transition-all hover:ring-indigo-500/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
                        : "cursor-not-allowed bg-slate-100/90 opacity-70 shadow-none ring-1 ring-slate-900/10 saturate-50",
                    )}
                  >
                    <p
                      className={cn(
                        "text-base font-bold tracking-tight sm:text-lg",
                        UPSCALER_REPLICATE_SELECTABLE
                          ? "text-slate-900"
                          : "text-slate-500",
                      )}
                    >
                      Replicate (Cloud)
                    </p>
                    <p
                      className={cn(
                        "mt-3 text-sm font-medium leading-relaxed",
                        UPSCALER_REPLICATE_SELECTABLE
                          ? "text-slate-600"
                          : "text-slate-500",
                      )}
                    >
                      Real-ESRGAN, Token auf dem Server
                    </p>
                    {!UPSCALER_REPLICATE_SELECTABLE ? (
                      <p className="mt-3 text-xs font-semibold text-slate-500">
                        Vorübergehend nicht verfügbar
                      </p>
                    ) : null}
                  </button>
                  {PRINTFLOW_LOCAL_STACK_ENABLED ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEngineMode("local");
                        setEngineChoiceConfirmed(true);
                      }}
                      className="flex min-h-[9.5rem] flex-col justify-between rounded-2xl bg-white p-6 text-left shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 transition-all hover:ring-indigo-500/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:p-7"
                    >
                      <p className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                        PrintFlow Engine (lokal)
                      </p>
                      <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
                        Kostenlos — nutzt deine Grafikkarte
                      </p>
                    </button>
                  ) : null}
                </div>
              </fieldset>
            </div>
            {(vertexUpscaleReady === null ||
              (UPSCALER_REPLICATE_SELECTABLE && replicateUpscaleReady === null)) ? (
              <div
                role="status"
                className="mx-auto mt-4 flex max-w-5xl items-start gap-3 rounded-xl bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-900/5"
                aria-live="polite"
              >
                <Loader2
                  className="mt-0.5 shrink-0 animate-spin text-indigo-600"
                  size={18}
                  aria-hidden
                />
                <p>Status der Cloud-Engines wird geprüft …</p>
              </div>
            ) : null}
          </div>
        </div>
      </AppPage>
    );
  }

  // ── Queue + Ergebnis (Einzel: Slider, Mehrfach: Textliste + ZIP) ──
  return (
    <AppPage className="pb-10">
      {isProcessing ? (
        <WorkSessionShell
          title="Upscaler"
          subtitle="Bilder werden nacheinander hochskaliert — bitte warten oder gezielt abbrechen."
          message={
            runningItem
              ? `Aktuell: ${runningItem.file.name}`
              : progressIdx === 0
                ? "Sitzung wird vorbereitet …"
                : `Schritt ${progressIdx} von ${progressTotal}`
          }
          current={progressIdx}
          total={Math.max(1, progressTotal)}
          etaLabel={sessionEtaLabel}
          onAbort={handleAbortUpscale}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
            {vertexApiGate ? (
              <div className="shrink-0">
                <VertexApiNotEnabledBox activationUrl={vertexApiGate} />
              </div>
            ) : null}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[rgb(255_255_255/0.15)] bg-work-session-panel shadow-work-session-panel ring-1 ring-work-session-panel">
              <div className="shrink-0 border-b border-work-session-hairline px-4 py-3 sm:px-5">
                <p className="text-work-session-lead-muted text-xs font-medium">
                  Einstellungen (dieser Lauf)
                </p>
                <p className="text-work-session-title mt-1 text-sm font-semibold">
                  {factor}×
                </p>
              </div>
              <div
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] p-3"
                aria-label="Liste der Bilder in der Verarbeitung"
              >
                <UpscalerQueueTable
                  items={items}
                  factor={factor}
                  isProcessing
                  onRemove={handleRemoveQueueItem}
                  variant="workSession"
                  sessionEtaLabel={sessionEtaLabel}
                  showActions={false}
                />
              </div>
            </div>
          </div>
        </WorkSessionShell>
      ) : null}
      {isBuildingZip ? (
        <LoadingOverlay
          show
          fullScreen
          className="z-[230]"
          message={zipProgress.message || "ZIP wird erstellt …"}
        />
      ) : null}
      {!isProcessing && vertexApiGate && engineMode === "vertex" ? (
        <VertexApiNotEnabledBox activationUrl={vertexApiGate} />
      ) : null}

      <div className="space-y-4">
      <h1 className="sr-only">KI Upscaler</h1>
      {genericError ? <ErrorBanner message={genericError} /> : null}

      {!showResults && !isProcessing && engineChoiceConfirmed ? (
        <div
          className="relative w-full min-w-0"
          role="group"
          aria-label="Upscaler-Warteschlange und Einstellungen"
        >
          <input
            ref={newJobFileInputRef}
            type="file"
            accept={RASTER_IMAGE_ACCEPT_HTML}
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              handlePickFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <LoadingOverlay
            show={
              engineMode === "local" &&
              isOnline &&
              (installingModelId !== null || uninstallingModelId !== null)
            }
            fullScreen={false}
            message={
              uninstallingModelId
                ? "Modell wird entfernt …"
                : installingModelId
                  ? "Modell wird installiert …"
                  : undefined
            }
          />
          <div className="grid w-full min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <WorkspacePanelCard
              title={
                <div className="flex w-full min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className={WORKSPACE_PANEL_TITLE}>Upscaler-Queue</h3>
                    <p className="mt-0.5 text-xs font-medium text-[color:var(--pf-fg-muted)]">
                      {queueSubtitle}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => newJobFileInputRef.current?.click()}
                    aria-label="Neue Motive zur Warteschlange hinzufügen"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Neuer Job
                  </Button>
                </div>
              }
              bodyClassName="p-3"
            >
              <UpscalerQueueTable
                items={items}
                factor={factor}
                isProcessing={isProcessing}
                onRemove={handleRemoveQueueItem}
              />
            </WorkspacePanelCard>

            <WorkspacePanelCard title="Neuer Upscale-Job" bodyClassName="p-3">
              <div className="flex min-h-0 flex-col gap-4">
                {items.length === 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start gap-1.5 px-0 text-[color:var(--pf-fg-muted)] hover:bg-transparent hover:text-[color:var(--pf-fg)]"
                    onClick={() => setEngineChoiceConfirmed(false)}
                    aria-label="Zurueck zur Engine-Auswahl"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                    Andere Engine
                  </Button>
                ) : null}

                <UploadQueueInitialDropzone
                  title="Motive auswählen"
                  description="Drag & Drop oder Datei auswählen — PNG, JPG, WebP."
                  accept={RASTER_IMAGE_ACCEPT_HTML}
                  onPickFiles={handlePickFiles}
                  className="min-h-[11rem] sm:min-h-[12rem]"
                />

                {(vertexUpscaleReady === null ||
                  (UPSCALER_REPLICATE_SELECTABLE && replicateUpscaleReady === null)) &&
                isCloudEngine ? (
                  <div
                    className="flex items-start gap-3 rounded-[length:var(--pf-radius-lg)] bg-[color:var(--pf-bg-muted)] px-4 py-3 text-xs font-medium text-[color:var(--pf-fg-muted)] ring-1 ring-inset ring-[color:var(--pf-border-subtle)]"
                    role="status"
                    aria-live="polite"
                  >
                    <Loader2
                      className="mt-0.5 shrink-0 animate-spin text-[color:var(--pf-accent)]"
                      size={16}
                      aria-hidden
                    />
                    <p>Cloud-Engines werden geprüft …</p>
                  </div>
                ) : null}

                {engineMode === "vertex" && vertexUpscaleReady === false ? (
                  <div className="rounded-[length:var(--pf-radius-lg)] border border-[color:var(--pf-warning)]/30 bg-[color:var(--pf-warning-bg)] px-4 py-3 text-xs text-[color:var(--pf-warning)] ring-1 ring-inset ring-[color:var(--pf-warning)]/20">
                    <p className="font-semibold text-[color:var(--pf-fg)]">
                      Vertex nicht bereit
                    </p>
                    <p className="mt-1 font-medium opacity-90">
                      Service-Account-.json in der KI-Integration hinterlegen.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        goToIntegration("gemini");
                        setEditingSetId(null);
                      }}
                    >
                      <Settings size={14} /> KI-Integration
                    </Button>
                  </div>
                ) : null}

                {engineMode === "replicate" && replicateUpscaleReady === false ? (
                  <div className="rounded-[length:var(--pf-radius-lg)] bg-[color:var(--pf-bg-muted)] px-4 py-3 text-xs font-medium text-[color:var(--pf-fg-muted)] ring-1 ring-inset ring-[color:var(--pf-border-subtle)]">
                    <p className="font-semibold text-[color:var(--pf-fg)]">
                      Replicate nicht bereit
                    </p>
                    <p className="mt-1">
                      REPLICATE_API_TOKEN muss auf dem Server gesetzt sein.
                    </p>
                  </div>
                ) : null}

                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[color:var(--pf-fg-muted)]">
                    Zielauflösung
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {UPSCALE_FACTOR_UI_OPTIONS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFactor(f)}
                        className={cn(
                          "min-w-[3.25rem] rounded-[length:var(--pf-radius)] px-3.5 py-2 text-sm font-semibold transition-colors",
                          factor === f
                            ? "bg-[color:var(--pf-fg)] text-[color:var(--pf-bg)] shadow-[var(--pf-shadow-sm)]"
                            : "border border-[color:var(--pf-border)] bg-[color:var(--pf-bg-elevated)] text-[color:var(--pf-fg-muted)] hover:bg-[color:var(--pf-bg-muted)] hover:text-[color:var(--pf-fg)]",
                        )}
                      >
                        {f}×
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-semibold text-[color:var(--pf-fg)]">
                    Modell
                  </p>
                  {engineMode === "vertex" ? (
                    <div className="rounded-[length:var(--pf-radius)] border border-[color:var(--pf-border)] bg-[color:var(--pf-bg-subtle)] px-3 py-2.5 text-sm font-medium text-[color:var(--pf-fg)]">
                      Vertex — imagegeneration@006
                    </div>
                  ) : null}
                  {engineMode === "replicate" ? (
                    <div className="rounded-[length:var(--pf-radius)] border border-[color:var(--pf-border)] bg-[color:var(--pf-bg-subtle)] px-3 py-2.5 text-sm font-medium text-[color:var(--pf-fg)]">
                      Replicate — Real-ESRGAN
                    </div>
                  ) : null}
                  {engineMode === "local" && activeModelId ? (
                    <div className="rounded-[length:var(--pf-radius)] border border-[color:var(--pf-border)] bg-[color:var(--pf-bg-subtle)] px-3 py-2.5 text-sm font-medium text-[color:var(--pf-fg)]">
                      {catalog?.models?.find((m) => m.id === activeModelId)
                        ?.label ?? activeModelId}
                    </div>
                  ) : null}
                  {engineMode === "local" && !activeModelId ? (
                    <div className="rounded-[length:var(--pf-radius)] border border-dashed border-[color:var(--pf-border)] bg-[color:var(--pf-bg-muted)] px-3 py-2.5 text-sm font-medium text-[color:var(--pf-fg-muted)]">
                      Kein aktives Modell — unten ein Modell wählen.
                    </div>
                  ) : null}
                </div>

                <Button
                  onClick={() => void handleBatchUpscale()}
                  className="w-full gap-2"
                  disabled={
                    isProcessing ||
                    upscaleQueueCount === 0 ||
                    (isCloudEngine && selectedCloudReady !== true) ||
                    (engineMode === "local" &&
                      (!canRunLocalUpscale ||
                        isChecking ||
                        installingModelId !== null ||
                        uninstallingModelId !== null))
                  }
                >
                  <Sparkles size={16} aria-hidden />
                  {items.length <= 1
                    ? "Upscale starten"
                    : `Upscale starten (${upscaleQueueCount})`}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleClearSelection}
                  disabled={isProcessing || items.length === 0}
                >
                  Liste leeren
                </Button>

                <div className={workspaceEmbeddedPanelClassName}>
                  <div
                    className="border-b border-[color:var(--pf-border)] px-4 py-3"
                    aria-label="Aktive Engine (ohne Umschaltung)"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--pf-fg-muted)]">
                      Aktive Engine
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--pf-fg)]">
                      {labelForEngineMode(engineMode)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-[color:var(--pf-fg-muted)]">
                      {items.length === 0
                        ? "Zum Wechsel der Engine oben „Andere Engine“ wählen."
                        : "Andere Engine: zuerst „Liste leeren“, danach „Andere Engine“."}
                    </p>
                  </div>

                  {engineMode === "local" && !isOnline && !isChecking ? (
                    <div className="space-y-3 border-b border-[color:var(--pf-border)] px-4 py-3">
                      <IntegrationMissingCallout
                        variant="slate"
                        title="PrintFlow Engine nicht gefunden"
                        description="Um deine eigene Grafikkarte kostenlos zu nutzen, lade PrintFlow Engine (Windows) herunter. Führe PrintFlowEngine.exe nach dem Download einmalig aus."
                        actionLabel="PrintFlow Engine herunterladen (ca. 25 MB)"
                        href={PRINTFLOW_ENGINE_DOWNLOAD_HREF}
                        download={PRINTFLOW_ENGINE_EXE_FILENAME}
                      />
                      <CompanionOfflineCopyUvicornCommand />
                    </div>
                  ) : null}

                  {engineMode === "local" && isOnline ? (
                    <div className="border-b border-[color:var(--pf-border)] px-4 py-3">
                      {canRunLocalUpscale ? (
                        <p className="mb-3 text-xs font-medium text-[color:var(--pf-success)]">
                          Aktives Modell bereit — du kannst hochskalieren.
                        </p>
                      ) : null}
                      <button
                        type="button"
                        id="upscaler-local-companion-toggle-queue"
                        aria-expanded={localCompanionOpen}
                        aria-controls="upscaler-local-companion-panel-queue"
                        onClick={() => setLocalCompanionOpen((o) => !o)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg py-1 text-left text-sm font-semibold text-[color:var(--pf-fg)] transition-colors hover:text-[color:var(--pf-accent)]"
                      >
                        <span>Lokale KI — PrintFlow Engine</span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-[color:var(--pf-fg-muted)] transition-transform duration-200",
                            localCompanionOpen && "rotate-180",
                          )}
                          aria-hidden
                        />
                      </button>
                      {localCompanionOpen ? (
                        <div
                          id="upscaler-local-companion-panel-queue"
                          className="mt-4 space-y-4"
                          role="region"
                          aria-labelledby="upscaler-local-companion-toggle-queue"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--pf-fg-muted)]">
                              PrintFlow Engine
                            </span>
                            {isChecking ? (
                              <span className="text-xs font-medium text-[color:var(--pf-fg-muted)]">
                                Pruefe …
                              </span>
                            ) : isOnline ? (
                              <span className="inline-flex items-center rounded-full bg-[color:var(--pf-success-bg)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[color:var(--pf-success)] ring-1 ring-inset ring-[color:var(--pf-success)]/25">
                                Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-[color:var(--pf-bg-muted)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[color:var(--pf-fg-muted)] ring-1 ring-inset ring-[color:var(--pf-border-subtle)]">
                                Offline
                              </span>
                            )}
                          </div>
                          {!isOutdated ? (
                            <CompanionLocalModelsPanel
                              catalog={catalog}
                              installedModelIds={installedModelIds}
                              activeModelId={activeModelId}
                              vulkanRuntimeInstalled={vulkanRuntimeInstalled}
                              installingModelId={installingModelId}
                              uninstallingModelId={uninstallingModelId}
                              onInstall={(id) => void handleInstallCompanionModel(id)}
                              onUninstall={(id) =>
                                void handleUninstallCompanionModel(id)
                              }
                              onSelectActive={(id) =>
                                void handleSelectCompanionActiveModel(id)
                              }
                              onUninstallVulkan={() =>
                                void handleUninstallVulkanRuntime()
                              }
                            />
                          ) : null}
                          {isOutdated ? (
                            <CompanionEngineOutdatedCallout
                              engineVersion={engineVersion}
                            />
                          ) : null}
                          {!isOutdated && !isChecking ? (
                            <div className="space-y-2">
                              <Select
                                label="Parallele Kacheln (lokal)"
                                name="companion-parallel-tiles-queue"
                                value={parallelTiles}
                                onChange={(e) =>
                                  setParallelTiles(
                                    e.target.value as ParallelTilesOption,
                                  )
                                }
                                aria-label="Parallele Kacheln fuer lokales Upscaling"
                              >
                                <option value="1">1 (sequenziell)</option>
                                <option value="2">2</option>
                                <option value="auto">Auto (konservativ)</option>
                              </Select>
                              <p className="text-xs font-medium leading-relaxed text-[color:var(--pf-fg-muted)]">
                                Lokale KI-Nutzung: Automatisch parallelisiert
                                (Standard „Auto“).
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {engineMode === "vertex" && selectedCloudReady === true ? (
                  <p className="rounded-[length:var(--pf-radius)] bg-[color:var(--pf-bg-muted)] px-3 py-2.5 text-xs font-medium leading-relaxed text-[color:var(--pf-fg-muted)] ring-1 ring-inset ring-[color:var(--pf-border-subtle)]">
                    Geschätzte Kosten: abhängig von Imagen/Vertex — wird deinem
                    Google-Cloud-Konto (BYOK) belastet.
                  </p>
                ) : null}
                {engineMode === "replicate" && selectedCloudReady === true ? (
                  <p className="rounded-[length:var(--pf-radius)] bg-[color:var(--pf-bg-muted)] px-3 py-2.5 text-xs font-medium leading-relaxed text-[color:var(--pf-fg-muted)] ring-1 ring-inset ring-[color:var(--pf-border-subtle)]">
                    Replicate berechnet pro API-Aufruf — Kosten siehst du im
                    Replicate-Dashboard.
                  </p>
                ) : null}
              </div>
            </WorkspacePanelCard>
          </div>
        </div>
      ) : null}

      {showResults && doneCount > 0 && singlePreviewItem ? (
        <div className="overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Ergebnis</h2>
            <Button variant="outline" onClick={() => setShowResults(false)}>
              Zurueck zur Liste
            </Button>
          </div>
          <div className="space-y-4 p-5">
            <p className="text-sm font-medium text-slate-900">
              {singlePreviewItem.file.name}
            </p>
            <BeforeAfterSlider
              beforeSrc={singlePreviewItem.previewUrl}
              afterSrc={singlePreviewItem.resultUrl!}
            />
            <div className="flex justify-center pt-2">
              <Button
                onClick={() => handleDownloadSinglePng(singlePreviewItem)}
              >
                <Download size={16} /> Bild herunterladen
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showResults && doneCount > 0 && items.length > 1 ? (
        <div className="overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Ergebnisse</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {doneCount} von {items.length} erfolgreich — ZIP enthaelt nur
                fertige Dateien.
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowResults(false)}>
              Zurueck zur Liste
            </Button>
          </div>

          <ul className="divide-y divide-slate-100" aria-label="Upscale-Ergebnisse">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex gap-3 px-5 py-3.5"
              >
                <div className="shrink-0 self-start pt-0.5">
                  {it.status === "done" ? (
                    <CheckCircle2
                      className="h-5 w-5 text-emerald-500"
                      aria-hidden
                    />
                  ) : it.status === "error" ? (
                    <AlertCircle
                      className="h-5 w-5 text-red-400"
                      aria-hidden
                    />
                  ) : it.status === "running" ? (
                    <Loader2
                      className="h-5 w-5 animate-spin text-indigo-500"
                      aria-hidden
                    />
                  ) : it.status === "cancelled" ? (
                    <span
                      className="text-xs font-medium text-slate-400"
                      aria-hidden
                    >
                      —
                    </span>
                  ) : (
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] text-slate-400 ring-1 ring-slate-900/10"
                      aria-hidden
                    >
                      ·
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {it.file.name}
                  </p>
                  {it.status === "done" &&
                  it.upscaledWidth &&
                  it.upscaledHeight ? (
                    <p className="mt-0.5 text-xs text-slate-600">
                      Fertig · Ausgabe {it.upscaledWidth}×{it.upscaledHeight} px
                    </p>
                  ) : null}
                  {it.status === "error" && it.errorMessage ? (
                    <p className="mt-0.5 text-xs text-red-600">
                      {it.errorMessage}
                    </p>
                  ) : null}
                  {it.status === "cancelled" && it.errorMessage ? (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {it.errorMessage}
                    </p>
                  ) : null}
                  {it.status === "pending" ? (
                    <p className="mt-0.5 text-xs text-slate-400">Ausstehend</p>
                  ) : null}
                  {it.status === "running" ? (
                    <p className="mt-0.5 text-xs text-indigo-600">Laeuft …</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-slate-100 px-5 py-4">
            <Button
              className="w-full"
              onClick={() => void handleDownloadZip()}
              disabled={doneCount === 0 || isBuildingZip}
            >
              <Download size={16} /> Alle fertigen als ZIP laden
            </Button>
          </div>
        </div>
      ) : null}
      </div>
    </AppPage>
  );
};

const VertexApiNotEnabledBox = ({
  activationUrl,
}: {
  activationUrl: string;
}) => (
  <div
    role="status"
    className="rounded-xl bg-[#eef2ff] px-4 py-4 text-sm text-[#1e1b4b] ring-1 ring-inset ring-[rgb(99_102_241/0.25)]"
  >
    <p className="font-semibold text-[#1e1b4b]">Vertex AI API</p>
    <p className="mt-2 leading-relaxed text-[rgb(30_27_75/0.95)]">
      Die Vertex-AI-API muss in deinem Google-Cloud-Projekt noch aktiviert werden.
    </p>
    <Button
      className="mt-4 w-full sm:w-auto"
      onClick={() =>
        window.open(activationUrl, "_blank", "noopener,noreferrer")
      }
    >
      API bei Google aktivieren
    </Button>
  </div>
);

const BeforeAfterSlider = ({
  beforeSrc,
  afterSrc,
}: {
  beforeSrc: string;
  afterSrc: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const isDragging = useRef(false);

  const updatePosition = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setPosition(pct);
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative max-h-[70vh] select-none overflow-hidden rounded-2xl bg-slate-900 shadow-lg ring-1 ring-white/10"
      style={{ cursor: "col-resize" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <img
        src={afterSrc}
        alt="Upscaled"
        className="block max-h-[70vh] w-full object-contain"
        draggable={false}
      />
      <img
        src={beforeSrc}
        alt="Original"
        className="absolute inset-0 max-h-[70vh] w-full object-contain"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        draggable={false}
      />
      <div
        className="absolute top-0 bottom-0"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        <div className="h-full w-0.5 bg-white shadow-[0_0_6px_rgba(0,0,0,0.4)]" />
        <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-white shadow-lg">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-slate-700"
          >
            <path
              d="M4.5 3L1 8L4.5 13M11.5 3L15 8L11.5 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      <div className="pointer-events-none absolute top-3 left-3 rounded-md bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
        Original
      </div>
      <div className="pointer-events-none absolute top-3 right-3 rounded-md bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
        Upscaled
      </div>
    </div>
  );
};

const companionModelSpeedLabel = (
  speed: CompanionModelEntry["speed"] | undefined,
): string | null => {
  if (!speed) return null;
  if (speed === "schnell") return "Schneller Durchlauf";
  if (speed === "mittel") return "Mittlere Geschwindigkeit";
  return "Eher langsamer (mehr Rechenlast)";
};

const companionQualityTierCaption = (tier: number | undefined): string => {
  if (tier == null || tier < 1) return "";
  if (tier >= 5) return "Sehr hohe erwartete Detailtreue";
  if (tier === 4) return "Hohe erwartete Detailtreue";
  if (tier === 3) return "Solide Detailtreue";
  return "Basis bis mittlere Detailtreue";
};

const CompanionOfflineCopyUvicornCommand = () => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getCompanionUvicornClipboardText());
      toast.success("Befehl in die Zwischenablage kopiert.");
    } catch {
      toast.error("Zwischenablage nicht verfuegbar (HTTPS oder Berechtigung).");
    }
  };

  const hasRepoRoot = Boolean(import.meta.env.VITE_MOCKUP_REPO_ROOT?.trim());

  return (
    <div
      role="region"
      aria-label="Development: PrintFlow Engine per Terminal starten"
      className="rounded-xl bg-slate-50/80 px-4 py-3 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-900/5"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
        Entwicklung
      </p>
      <p className="mt-2 leading-relaxed text-slate-700">
        Ein Browser kann PowerShell nicht direkt starten. Kopiere den Befehl
        und fuege ihn in PowerShell oder im Terminal ein (Projektroot =
        Ordner mit <span className="font-mono text-[11px]">companion_app</span>
        ).
      </p>
      {!hasRepoRoot ? (
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          Optional: In <span className="font-mono">.env.local</span>{" "}
          <span className="font-mono">VITE_MOCKUP_REPO_ROOT</span> auf deinen
          Pfad setzen — dann enthaelt der Kopiertext ein fertiges{" "}
          <span className="font-mono">cd</span>.
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 w-full sm:w-auto"
        onClick={() => void handleCopy()}
      >
        <Copy className="h-3.5 w-3.5" aria-hidden />
        uvicorn-Befehl kopieren
      </Button>
    </div>
  );
};

const CompanionEngineOutdatedCallout = ({
  engineVersion,
}: {
  engineVersion: string | null;
}) => (
  <div
    role="alert"
    className="rounded-xl bg-amber-50 px-4 py-4 text-sm text-amber-950 ring-1 ring-inset ring-amber-500/20"
  >
    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800/90">
      PrintFlow Engine
    </p>
    <p className="mt-1 font-semibold tracking-tight text-amber-950">
      Version veraltet — lokaler Bereich gesperrt
    </p>
    <p className="mt-2 text-xs font-medium leading-relaxed text-amber-900/95">
      Es laeuft Version{" "}
      <span className="font-semibold text-amber-950">
        {engineVersion ?? "unbekannt"}
      </span>
      , erwartet wird{" "}
      <span className="font-semibold text-amber-950">
        {EXPECTED_ENGINE_VERSION}
      </span>
      . Bitte die aktuelle PrintFlowEngine.exe laden, die bestehende Datei
      ersetzen und PrintFlow Engine neu starten. Danach ist die Auswahl wieder frei.
    </p>
    <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs font-medium text-amber-900/90">
      <li>Neuere Version herunterladen (Button unten).</li>
      <li>Alte Datei im gleichen Ordner ersetzen und PrintFlow Engine neu starten.</li>
    </ol>
    <a
      href={PRINTFLOW_ENGINE_DOWNLOAD_HREF}
      download={PRINTFLOW_ENGINE_EXE_FILENAME}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-amber-950 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-amber-300/80 transition-colors hover:bg-amber-100/80 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/25"
    >
      <Download className="h-4 w-4 shrink-0" aria-hidden />
      PrintFlow Engine aktualisieren (.exe)
    </a>
  </div>
);

const CompanionLocalModelsPanel = ({
  catalog,
  installedModelIds,
  activeModelId,
  vulkanRuntimeInstalled,
  installingModelId,
  uninstallingModelId,
  onInstall,
  onUninstall,
  onSelectActive,
  onUninstallVulkan,
}: {
  catalog: CompanionCatalog | null;
  installedModelIds: string[];
  activeModelId: string | null;
  vulkanRuntimeInstalled: boolean;
  installingModelId: string | null;
  uninstallingModelId: string | null;
  onInstall: (modelId: string) => void;
  onUninstall: (modelId: string) => void;
  onSelectActive: (modelId: string) => void;
  onUninstallVulkan: () => void;
}) => {
  const opBusy =
    installingModelId !== null || uninstallingModelId !== null;

  const sortedModels = useMemo(() => {
    if (!catalog?.models?.length) return [];
    return [...catalog.models].sort((a, b) => {
      const dq = (b.quality_tier ?? 0) - (a.quality_tier ?? 0);
      if (dq !== 0) return dq;
      return a.label.localeCompare(b.label, "de");
    });
  }, [catalog]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-slate-50/50 px-4 py-3 ring-1 ring-inset ring-slate-900/5">
        <fieldset>
          <legend className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Lokale Modelle
          </legend>
          {!catalog ? (
            <p className="mt-3 text-xs font-medium text-slate-500">
              Katalog wird geladen …
            </p>
          ) : catalog.models.length === 0 ? (
            <p className="mt-3 text-xs font-medium text-slate-500">
              Keine Eintraege im Katalog.
            </p>
          ) : (
            <>
              <p className="mt-2 text-[10px] font-medium leading-relaxed text-slate-500">
                Die Skala „Detailtreue“ ist eine Orientierung (subjektiv): hoehere
                Werte bedeuten oft schaerfere Kanten und mehr Struktur, nicht
                automatisch das schoenere Ergebnis. Waehle passend zu Fotos vs.
                Anime.
              </p>
              <ul className="mt-3 space-y-3">
                {sortedModels.map((m) => {
                const installed = installedModelIds.includes(m.id);
                const isActive = activeModelId === m.id;
                const busyInstall = installingModelId === m.id;
                const busyRemove = uninstallingModelId === m.id;
                const qt = Math.min(5, Math.max(0, m.quality_tier ?? 0));
                const speedText = companionModelSpeedLabel(m.speed);
                return (
                  <li
                    key={m.id}
                    className="rounded-lg bg-white p-3 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex cursor-pointer items-start gap-2">
                            <input
                              type="radio"
                              name="companion-active-model"
                              className="mt-0.5"
                              checked={isActive}
                              disabled={!installed || opBusy}
                              onChange={() => onSelectActive(m.id)}
                              aria-label={`${m.label} als aktives Modell`}
                            />
                            <span className="text-sm font-semibold text-slate-900">
                              {m.label}
                            </span>
                          </label>
                          {installed ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-800 ring-1 ring-emerald-500/20">
                              Installiert
                            </span>
                          ) : null}
                        </div>
                        {m.tags && m.tags.length > 0 ? (
                          <div
                            className="mt-2 flex flex-wrap gap-1.5"
                            aria-label="Motiv-Tags"
                          >
                            {m.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 ring-1 ring-slate-900/5"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {qt > 0 ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Detailtreue
                            </span>
                            <div
                              className="flex gap-0.5"
                              aria-hidden
                              title={companionQualityTierCaption(qt)}
                            >
                              {[1, 2, 3, 4, 5].map((i) => (
                                <span
                                  key={i}
                                  className={cn(
                                    "h-2 w-2 rounded-full",
                                    i <= qt ? "bg-indigo-500" : "bg-slate-200",
                                  )}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] font-medium text-slate-600">
                              {companionQualityTierCaption(qt)}
                            </span>
                          </div>
                        ) : null}
                        {speedText ? (
                          <p className="mt-1 text-[10px] font-medium text-slate-500">
                            {speedText}
                          </p>
                        ) : null}
                        {m.quality_summary ? (
                          <p className="mt-2 rounded-lg bg-indigo-50/80 px-3 py-2 text-xs font-medium leading-snug text-indigo-950 ring-1 ring-indigo-500/15">
                            {m.quality_summary}
                          </p>
                        ) : null}
                        <p className="mt-1.5 text-xs font-medium text-slate-500">
                          {m.description}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {!installed ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={opBusy}
                            onClick={() => onInstall(m.id)}
                          >
                            {busyInstall ? (
                              <Loader2
                                className="h-4 w-4 animate-spin"
                                aria-hidden
                              />
                            ) : (
                              "Installieren"
                            )}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-red-700 ring-red-200 hover:bg-red-50"
                            disabled={opBusy}
                            onClick={() => onUninstall(m.id)}
                          >
                            {busyRemove ? (
                              <Loader2
                                className="h-4 w-4 animate-spin"
                                aria-hidden
                              />
                            ) : (
                              <>
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                Deinstallieren
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
              </ul>
            </>
          )}
        </fieldset>
      </div>

      {installedModelIds.length > 0 && !vulkanRuntimeInstalled ? (
        <div
          role="status"
          className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-950 ring-1 ring-inset ring-amber-500/20"
        >
          <p className="font-semibold">Real-ESRGAN-Programm fehlt</p>
          <p className="mt-1 text-amber-900/90">
            Modell-Dateien sind da, aber realesrgan-ncnn-vulkan.exe wurde nicht
            gefunden. Bitte bei einem Eintrag erneut{" "}
            <span className="font-semibold">Installieren</span> (gleiche
            ZIP — entpackt EXE und DLLs).
          </p>
        </div>
      ) : null}

      {vulkanRuntimeInstalled ? (
        <div className="rounded-xl bg-slate-50/50 px-4 py-2 ring-1 ring-inset ring-slate-900/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Real-ESRGAN-Programm
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 w-full text-slate-700"
            disabled={opBusy}
            onClick={onUninstallVulkan}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            EXE / Vulkan-Laufzeit entfernen
          </Button>
        </div>
      ) : null}
    </div>
  );
};

const ErrorBanner = ({ message }: { message: string }) => (
  <div
    role="status"
    className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900"
  >
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden />
    <p className="leading-snug">{message}</p>
  </div>
);
