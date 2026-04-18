import JSZip from "jszip";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  ImageUp,
  Loader2,
  Maximize,
  Settings,
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

import { aiStatus } from "../../api/ai";
import type {
  CompanionCatalog,
  CompanionModelEntry,
} from "../../api/companion";
import type { UpscaleFactor } from "../../api/upscaler";
import {
  UpscaleVertexApiNotEnabledError,
  upscaleImage,
} from "../../api/upscaler";
import { ApiError, refreshAccessToken } from "../../api/client";
import { useCompanionBatchTileEta } from "../../hooks/useCompanionBatchTileEta";
import {
  EXPECTED_ENGINE_VERSION,
  type ParallelTilesOption,
  useCompanionApp,
} from "../../hooks/useCompanionApp";
import { useWorkSessionEta } from "../../hooks/useWorkSessionEta";
import type { CompanionTileProgressReady } from "../../lib/companionTileProgress";
import { cn } from "../../lib/cn";
import { getCompanionUvicornClipboardText } from "../../lib/companionDevStartCommand";
import { triggerAnchorDownload } from "../../lib/download";
import { getErrorMessage } from "../../lib/error";
import {
  filterRasterImageFiles,
  MAX_UPSCALER_IMAGE_BYTES,
} from "../../lib/imageUploadAccept";
import { MOCKUP_LOCAL_ENGINE_HREF } from "../../lib/localEngine";
import { UPSCALE_MAX_OUTPUT_PIXELS } from "../../lib/upscaleMaxOutputPixels";
import { formatUpscaleUserMessage } from "../../lib/upscaleUserMessage";
import { toast } from "../../lib/toast";
import { useAppStore } from "../../store/appStore";
import { AppPage } from "../ui/AppPage";
import { Button } from "../ui/Button";
import { Dropzone } from "../ui/Dropzone";
import { Select } from "../ui/Select";
import { IntegrationMissingCallout } from "../ui/IntegrationMissingCallout";
import { LinearLoadingBar } from "../ui/LinearLoadingBar";
import { WorkSessionShell } from "../ui/workSession/WorkSessionShell";

/** Cloud (Vertex): konservativ wegen API-Kosten/Quota. */
const MAX_BATCH_FILES_CLOUD = 15;
/** Local Engine: keine Vertex-Limits — mehr Motive pro Durchgang. */
const MAX_BATCH_FILES_LOCAL = 50;

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
  const goToIntegrationWizardStep = useAppStore((s) => s.goToIntegrationWizardStep);
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

  const [items, setItems] = useState<BatchItem[]>([]);
  const [factor, setFactor] = useState<UpscaleFactor>("x4");
  const [vertexReady, setVertexReady] = useState<boolean | null>(null);
  const [vertexApiGate, setVertexApiGate] = useState<string | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  /** Nach dem Lauf: Einzelbild = Vorher/Nachher; mehrere = nur Textliste + ZIP. */
  const [showResults, setShowResults] = useState(false);
  const [progressIdx, setProgressIdx] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  const [engineMode, setEngineMode] = useState<"cloud" | "local">("cloud");
  const [parallelTiles, setParallelTiles] =
    useState<ParallelTilesOption>("1");
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
  } = useCompanionApp();

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
        const s = await aiStatus();
        setVertexReady(!!s.vertex_upscaler_configured);
      } catch {
        setVertexReady(false);
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

    let batch = picked;
    if (batch.length > maxBatch) {
      toast.error(
        `Maximal ${maxBatch} Dateien pro Durchgang (${engineMode === "local" ? "lokal" : "Cloud"}). Es werden nur die ersten ${maxBatch} verwendet.`,
      );
      batch = batch.slice(0, maxBatch);
    }

    setItems((prev) => {
      revokeAllUrls(prev);
      const next: BatchItem[] = batch.map((file) => ({
        id: nextId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "pending" as const,
      }));
      for (const it of next) {
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
      return next;
    });
    setShowResults(false);
  }, [engineMode, revokeAllUrls]);

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
      "realesrgan-ncnn-vulkan.exe und vcomp-DLLs aus dem Companion-Ordner loeschen? Modell-Dateien unter models/ bleiben — danach erneut „Installieren“, um die EXE zurueckzuholen.",
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
          "Local Engine nicht erreichbar. Bitte die Companion-App starten.",
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
    } else if (!vertexReady) {
      toast.error(
        "Bitte zuerst unter Integrationen → Gemini (KI) ein Vertex-Dienstkonto hinterlegen.",
      );
      return;
    }

    setGenericError(null);
    setVertexApiGate(null);

    const todo = items
      .map((it, idx) => ({ it, idx }))
      .filter(({ it }) => it.status === "pending" || it.status === "error");

    if (todo.length === 0) {
      toast.error("Waehle zuerst Bilder aus oder setze fehlgeschlagene zurueck.");
      return;
    }

    if (engineMode === "cloud") {
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
    setSessionEtaLabel(getRemainingLabel(todo.length));
    setIsProcessing(true);
    setNavigationLocked(true);
    setProgressTotal(todo.length);
    setProgressIdx(0);

    let anySuccess = false;
    let vertexAborted = false;
    let successInThisRun = 0;
    let finishedNormally = false;

    try {
      for (let i = 0; i < todo.length; i++) {
        const { it, idx } = todo[i]!;
        setProgressIdx(i + 1);
        if (engineMode === "local") {
          beginCompanionTileImage();
          setSessionEtaLabel("Restzeit wird geschätzt …");
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
              ? await upscaleWithCompanion(it.file, factor, {
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
              : await upscaleImage(it.file, factor, { signal });
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
            engineMode === "cloud"
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
            "Vertex API nicht aktiv — weiter geht es nach Aktivierung. Fertige Bilder kannst du trotzdem laden.",
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
    vertexReady,
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

  const pendingCount = useMemo(
    () => items.filter((i) => i.status === "pending" || i.status === "error").length,
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

  // ── Empty: Dropzone oben/links (sticky), Engine/Modelle daneben ──
  if (items.length === 0) {
    return (
      <AppPage>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="text-center lg:text-left">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 lg:mx-0">
            <Maximize size={24} className="text-indigo-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">KI Upscaler</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cloud: Google Imagen / Vertex. Lokal: kostenlose Companion-App auf
            deiner GPU — nacheinander verarbeitet. Ein Bild: Vorher/Nachher; mehrere:
            Ergebnisliste mit ZIP.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]">
          <section
            aria-label="Bilder hochladen"
            className="space-y-4 lg:sticky lg:top-4 lg:z-10 lg:self-start"
          >
            <Dropzone
              title="Bilder hierher ziehen oder klicken"
              description={`JPG, PNG oder WebP — je max. 10 MB, bis ${engineMode === "local" ? MAX_BATCH_FILES_LOCAL : MAX_BATCH_FILES_CLOUD} Dateien`}
              icon={<ImageUp size={32} className="text-slate-400" />}
              accept="image/jpeg,image/png,image/webp"
              multiple
              onPickFiles={handlePickFiles}
              onChange={(e) => handlePickFiles(e.target.files)}
              className="py-12"
            />
            {genericError ? <ErrorBanner message={genericError} /> : null}
          </section>

          <aside className="min-w-0 space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5">
              <fieldset>
                <legend className="text-xs font-medium text-slate-500">Engine</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={engineMode === "cloud"}
                    onClick={() => setEngineMode("cloud")}
                    className={cn(
                      "rounded-2xl p-4 text-left shadow-[0_2px_8px_rgb(0,0,0,0.04)] transition-all ring-1",
                      engineMode === "cloud"
                        ? "bg-indigo-50 ring-indigo-500/25"
                        : "bg-white ring-slate-900/5 hover:bg-slate-50",
                    )}
                  >
                    <p className="text-sm font-semibold tracking-tight text-slate-900">
                      Cloud Engine (Vertex)
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Standard — Imagen 4.0 in der Cloud
                    </p>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={engineMode === "local"}
                    onClick={() => setEngineMode("local")}
                    className={cn(
                      "rounded-2xl p-4 text-left shadow-[0_2px_8px_rgb(0,0,0,0.04)] transition-all ring-1",
                      engineMode === "local"
                        ? "bg-indigo-50 ring-indigo-500/25"
                        : "bg-white ring-slate-900/5 hover:bg-slate-50",
                    )}
                  >
                    <p className="text-sm font-semibold tracking-tight text-slate-900">
                      Local Engine (Companion App)
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Kostenlos — nutzt deine Grafikkarte
                    </p>
                  </button>
                </div>
              </fieldset>
              {engineMode === "local" ? (
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Companion
                    </span>
                    {isChecking ? (
                      <span className="text-xs font-medium text-slate-500">
                        Pruefe …
                      </span>
                    ) : isOnline ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 ring-1 ring-emerald-500/20">
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 ring-1 ring-slate-900/10">
                        Offline
                      </span>
                    )}
                  </div>
                  {isOnline && !isOutdated ? (
                    <CompanionLocalModelsPanel
                      catalog={catalog}
                      installedModelIds={installedModelIds}
                      activeModelId={activeModelId}
                      vulkanRuntimeInstalled={vulkanRuntimeInstalled}
                      installingModelId={installingModelId}
                      uninstallingModelId={uninstallingModelId}
                      onInstall={(id) => void handleInstallCompanionModel(id)}
                      onUninstall={(id) => void handleUninstallCompanionModel(id)}
                      onSelectActive={(id) =>
                        void handleSelectCompanionActiveModel(id)
                      }
                      onUninstallVulkan={() => void handleUninstallVulkanRuntime()}
                    />
                  ) : null}
                  {engineMode === "local" && isOnline && isOutdated ? (
                    <CompanionEngineOutdatedCallout
                      engineVersion={engineVersion}
                    />
                  ) : null}
                  {engineMode === "local" &&
                  isOnline &&
                  !isOutdated &&
                  !isChecking ? (
                    <Select
                      label="Parallele Kacheln (lokal)"
                      name="companion-parallel-tiles-empty"
                      value={parallelTiles}
                      onChange={(e) =>
                        setParallelTiles(e.target.value as ParallelTilesOption)
                      }
                      aria-label="Parallele Kacheln fuer lokales Upscaling"
                    >
                      <option value="1">1 (sequenziell)</option>
                      <option value="2">2</option>
                      <option value="auto">Auto (konservativ)</option>
                    </Select>
                  ) : null}
                </div>
              ) : null}
            </div>

            {engineMode === "local" && !isOnline && !isChecking ? (
              <div className="space-y-3">
                <IntegrationMissingCallout
                  variant="slate"
                  title="Local Engine nicht gefunden"
                  description="Um deine eigene Grafikkarte kostenlos zu nutzen, lade dir unsere Local Engine herunter. Führe die Datei nach dem Download einmalig aus."
                  actionLabel="Local Engine Herunterladen (ca. 25 MB)"
                  href={MOCKUP_LOCAL_ENGINE_HREF}
                  download="MockupLocalEngine.exe"
                />
                <CompanionOfflineCopyUvicornCommand />
              </div>
            ) : null}

            {vertexReady === false && engineMode === "cloud" ? (
              <div
                role="status"
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950"
              >
                <p className="font-medium">Vertex-Dienstkonto fehlt</p>
                <p className="mt-1 text-xs text-amber-900/90">
                  Für den Upscaler brauchst du ein eigenes Google-Cloud-Dienstkonto
                  (BYOK). Richte es im geführten Assistenten unter{" "}
                  <span className="font-semibold">Schritt 3: Vertex AI</span> ein
                  (oder unter Integrationen → Gemini (KI) → Vertex AI).
                </p>
                <Button
                  variant="outline"
                  className="mt-3 border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
                  onClick={() => {
                    goToIntegrationWizardStep(3);
                    setEditingSetId(null);
                  }}
                >
                  <Settings size={16} /> Vertex einrichten
                </Button>
              </div>
            ) : null}
          </aside>
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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-900/70 shadow-xl shadow-indigo-950/25 ring-1 ring-indigo-400/15">
              <div className="shrink-0 border-b border-white/10 px-4 py-3 sm:px-5">
                <p className="text-xs font-medium text-indigo-100/70">
                  Upscale-Faktor (dieser Lauf)
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {factor.toUpperCase()}
                </p>
              </div>
              <div
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
                aria-label="Liste der Bilder in der Verarbeitung"
              >
                <UpscalerQueueList items={items} factor={factor} variant="dark" />
              </div>
            </div>
          </div>
        </WorkSessionShell>
      ) : null}
      {isBuildingZip ? (
        <WorkSessionShell
          shellClassName="z-[100]"
          title="ZIP wird erstellt"
          message={zipProgress.message}
          current={zipProgress.current}
          total={zipProgress.total}
          packPercent={zipProgress.packPercent}
        >
          <div className="min-h-0 flex-1" aria-hidden />
        </WorkSessionShell>
      ) : null}
      {!isProcessing && vertexApiGate && engineMode === "cloud" ? (
        <VertexApiNotEnabledBox activationUrl={vertexApiGate} />
      ) : null}

      <div className="mx-auto max-w-6xl space-y-6 px-1 sm:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleClearSelection}
          disabled={isProcessing}
          className="flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft size={16} /> Neue Auswahl
        </button>
        <p className="text-xs text-slate-500">
          {items.length} Datei(en)
          {doneCount > 0 ? ` · ${doneCount} fertig` : ""}
        </p>
      </div>

      {genericError ? <ErrorBanner message={genericError} /> : null}

      {!showResults && !isProcessing ? (
        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <section
            aria-label="Ausgewaehlte Bilder"
            className="min-w-0 space-y-4 lg:col-span-7"
          >
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5">
              {engineMode === "local" &&
              isOnline &&
              (installingModelId || uninstallingModelId) ? (
                <div className="border-b border-slate-100 px-5 py-3">
                  <LinearLoadingBar
                    message={
                      uninstallingModelId
                        ? "Modell wird entfernt …"
                        : "Modell wird installiert …"
                    }
                  />
                </div>
              ) : null}

              {engineMode === "local" && isOnline && canRunLocalUpscale ? (
                <div className="border-b border-slate-100 px-5 py-3">
                  <p className="text-xs font-medium text-emerald-800">
                    Aktives Modell bereit — du kannst hochskalieren.
                  </p>
                </div>
              ) : null}

              <UpscalerQueueList items={items} factor={factor} />

              {vertexReady === false && engineMode === "cloud" ? (
                <div className="border-t border-amber-100 bg-amber-50/50 px-5 py-3 text-xs text-amber-950">
                  <p className="font-medium">Vertex-Dienstkonto fehlt</p>
                  <Button
                    variant="outline"
                    className="mt-2 border-amber-300 bg-white text-xs text-amber-950"
                    onClick={() => {
                      goToIntegrationWizardStep(3);
                      setEditingSetId(null);
                    }}
                  >
                    <Settings size={14} /> Vertex einrichten
                  </Button>
                </div>
              ) : null}
            </div>
          </section>

          <aside
            aria-label="Engine und Einstellungen"
            className="space-y-4 lg:sticky lg:top-4 lg:z-10 lg:col-span-5 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:self-start"
          >
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5">
              <div className="border-b border-slate-100 px-5 py-4">
                <fieldset>
                  <legend className="mb-2 block text-xs font-medium text-slate-500">
                    Engine
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={engineMode === "cloud"}
                      onClick={() => setEngineMode("cloud")}
                      className={cn(
                        "rounded-2xl p-4 text-left shadow-[0_2px_8px_rgb(0,0,0,0.04)] transition-all ring-1",
                        engineMode === "cloud"
                          ? "bg-indigo-50 ring-indigo-500/25"
                          : "bg-white ring-slate-900/5 hover:bg-slate-50",
                      )}
                    >
                      <p className="text-sm font-semibold tracking-tight text-slate-900">
                        Cloud Engine (Vertex)
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        Standard — Imagen 4.0 in der Cloud
                      </p>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={engineMode === "local"}
                      onClick={() => setEngineMode("local")}
                      className={cn(
                        "rounded-2xl p-4 text-left shadow-[0_2px_8px_rgb(0,0,0,0.04)] transition-all ring-1",
                        engineMode === "local"
                          ? "bg-indigo-50 ring-indigo-500/25"
                          : "bg-white ring-slate-900/5 hover:bg-slate-50",
                      )}
                    >
                      <p className="text-sm font-semibold tracking-tight text-slate-900">
                        Local Engine (Companion App)
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        Kostenlos — nutzt deine Grafikkarte
                      </p>
                    </button>
                  </div>
                </fieldset>
                {engineMode === "local" ? (
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Companion
                      </span>
                      {isChecking ? (
                        <span className="text-xs font-medium text-slate-500">
                          Pruefe …
                        </span>
                      ) : isOnline ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 ring-1 ring-emerald-500/20">
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 ring-1 ring-slate-900/10">
                          Offline
                        </span>
                      )}
                    </div>
                    {isOnline && !isOutdated ? (
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
                    {engineMode === "local" && isOnline && isOutdated ? (
                      <CompanionEngineOutdatedCallout
                        engineVersion={engineVersion}
                      />
                    ) : null}
                    {engineMode === "local" &&
                    isOnline &&
                    !isOutdated &&
                    !isChecking ? (
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
                    ) : null}
                  </div>
                ) : null}
              </div>

              {engineMode === "local" && !isOnline && !isChecking ? (
                <div className="space-y-3 border-b border-slate-100 px-5 py-4">
                  <IntegrationMissingCallout
                    variant="slate"
                    title="Local Engine nicht gefunden"
                    description="Um deine eigene Grafikkarte kostenlos zu nutzen, lade dir unsere Local Engine herunter. Führe die Datei nach dem Download einmalig aus."
                    actionLabel="Local Engine Herunterladen (ca. 25 MB)"
                    href={MOCKUP_LOCAL_ENGINE_HREF}
                    download="MockupLocalEngine.exe"
                  />
                  <CompanionOfflineCopyUvicornCommand />
                </div>
              ) : null}

              <div className="border-b border-slate-100 px-5 py-4">
                <label className="mb-2 block text-xs font-medium text-slate-500">
                  Upscale-Faktor (fuer alle)
                </label>
                <div className="flex gap-2">
                  {(["x2", "x4"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFactor(f)}
                      className={`rounded-xl px-5 py-2.5 text-sm font-semibold shadow-[0_2px_8px_rgb(0,0,0,0.04)] transition-all duration-200 ring-1 ${
                        factor === f
                          ? "bg-indigo-50 text-indigo-700 ring-indigo-500/25"
                          : "bg-white text-slate-600 ring-slate-900/5 hover:bg-slate-50"
                      }`}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 px-5 py-4">
                <Button
                  onClick={() => void handleBatchUpscale()}
                  className="w-full"
                  disabled={
                    pendingCount === 0 ||
                    (engineMode === "cloud" && vertexReady === false) ||
                    (engineMode === "local" &&
                      (!canRunLocalUpscale ||
                        isChecking ||
                        installingModelId !== null ||
                        uninstallingModelId !== null))
                  }
                >
                  <Maximize size={16} />
                  {items.length === 1
                    ? "Upscale starten"
                    : `Alle hochskalieren (${pendingCount})`}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {showResults && doneCount > 0 && singlePreviewItem ? (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5">
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
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5">
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

const UpscalerQueueList = ({
  items,
  factor,
  variant = "light",
}: {
  items: BatchItem[];
  factor: UpscaleFactor;
  variant?: "light" | "dark";
}) => {
  const dark = variant === "dark";
  return (
    <ul
      className={cn(
        "divide-y",
        dark ? "divide-white/10" : "divide-slate-100",
      )}
    >
      {items.map((it) => {
        const mult = parseInt(factor.slice(1), 10);
        const targetW = it.originalWidth ? it.originalWidth * mult : null;
        const targetH = it.originalHeight ? it.originalHeight * mult : null;
        const needsTiling =
          targetW != null &&
          targetH != null &&
          targetW * targetH > UPSCALE_MAX_OUTPUT_PIXELS;

        return (
          <li key={it.id} className="flex gap-4 px-4 py-4 sm:px-5">
            <div
              className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-lg border",
                dark
                  ? "border-white/15 bg-slate-900/60"
                  : "border-slate-200 bg-slate-50",
              )}
            >
              <img
                src={it.previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-sm font-medium",
                  dark ? "text-white" : "text-slate-900",
                )}
              >
                {it.file.name}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-xs",
                  dark ? "text-indigo-100/75" : "text-slate-500",
                )}
              >
                {(it.file.size / (1024 * 1024)).toFixed(2)} MB
                {it.status === "done" && it.upscaledWidth && it.upscaledHeight
                  ? ` → ${it.upscaledWidth}×${it.upscaledHeight}`
                  : null}
              </p>
              {needsTiling ? (
                <p
                  className={cn(
                    "mt-1 text-xs",
                    dark ? "text-amber-200/90" : "text-amber-600",
                  )}
                >
                  Kachelverarbeitung (über 17 MP) – kann länger dauern.
                </p>
              ) : null}
              {it.status === "error" && it.errorMessage ? (
                <p
                  className={cn(
                    "mt-1 text-xs",
                    dark ? "text-red-300" : "text-red-600",
                  )}
                >
                  {it.errorMessage}
                </p>
              ) : null}
              {it.status === "cancelled" && it.errorMessage ? (
                <p
                  className={cn(
                    "mt-1 text-xs",
                    dark ? "text-slate-400" : "text-slate-500",
                  )}
                >
                  {it.errorMessage}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 self-center text-xs">
              {it.status === "pending" ? (
                <span
                  className={dark ? "text-indigo-200/50" : "text-slate-400"}
                >
                  Wartet
                </span>
              ) : null}
              {it.status === "running" ? (
                <Loader2
                  className={cn(
                    "h-5 w-5 animate-spin",
                    dark ? "text-violet-300" : "text-indigo-500",
                  )}
                />
              ) : null}
              {it.status === "done" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : null}
              {it.status === "error" ? (
                <AlertCircle className="h-5 w-5 text-red-400" />
              ) : null}
              {it.status === "cancelled" ? (
                <span
                  className={dark ? "text-indigo-200/45" : "text-slate-400"}
                >
                  —
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

const VertexApiNotEnabledBox = ({
  activationUrl,
}: {
  activationUrl: string;
}) => (
  <div
    role="status"
    className="rounded-xl bg-indigo-50 px-4 py-4 text-sm text-indigo-950 ring-1 ring-inset ring-indigo-500/20"
  >
    <p className="font-semibold text-indigo-950">Fast geschafft!</p>
    <p className="mt-2 leading-relaxed text-indigo-900/95">
      Du musst die Vertex AI API in deinem Google Cloud Projekt noch aktivieren,
      bevor du dein erstes Bild skalieren kannst.
    </p>
    <Button
      className="mt-4 w-full sm:w-auto"
      onClick={() =>
        window.open(activationUrl, "_blank", "noopener,noreferrer")
      }
    >
      Jetzt API aktivieren
    </Button>
    <p className="mt-3 text-xs leading-relaxed text-indigo-800/90">
      Klicke auf den Button, aktiviere die API bei Google und warte ca. 2–3
      Minuten. Klicke danach einfach hier noch einmal auf &quot;Alle
      hochskalieren&quot; bzw. &quot;Upscale starten&quot;.
    </p>
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
      aria-label="Development: Companion per Terminal starten"
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
      Local Engine
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
      . Bitte die aktuelle MockupLocalEngine.exe laden, die bestehende Datei
      ersetzen und die Engine neu starten. Danach ist die Auswahl wieder frei.
    </p>
    <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs font-medium text-amber-900/90">
      <li>Neuere Version herunterladen (Button unten).</li>
      <li>Alte Datei im gleichen Ordner ersetzen und die Local Engine neu starten.</li>
    </ol>
    <a
      href={MOCKUP_LOCAL_ENGINE_HREF}
      download="MockupLocalEngine.exe"
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-amber-950 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-amber-300/80 transition-colors hover:bg-amber-100/80 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/25"
    >
      <Download className="h-4 w-4 shrink-0" aria-hidden />
      Neuere MockupLocalEngine.exe herunterladen
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
