import JSZip from "jszip";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  ImageUp,
  Loader2,
  Maximize,
  Settings,
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
import type { UpscaleFactor } from "../../api/upscaler";
import {
  UpscaleVertexApiNotEnabledError,
  upscaleImage,
} from "../../api/upscaler";
import { ApiError, refreshAccessTokenIfExpiringSoon } from "../../api/client";
import { triggerAnchorDownload } from "../../lib/download";
import { getErrorMessage } from "../../lib/error";
import { formatUpscaleUserMessage } from "../../lib/upscaleUserMessage";
import { toast } from "../../lib/toast";
import { useAppStore } from "../../store/appStore";
import { AppPage } from "../ui/AppPage";
import { BlockingProgressOverlay } from "../ui/BlockingProgressOverlay";
import { Button } from "../ui/Button";
import { Dropzone } from "../ui/Dropzone";

const MAX_OUTPUT_PIXELS = 17_000_000;
const MAX_BATCH_FILES = 50;
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

type ItemStatus = "pending" | "running" | "done" | "error";

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

export const UpscalerView = () => {
  const activeTab = useAppStore((s) => s.activeTab);
  const workspaceTab = useAppStore((s) => s.workspaceTab);
  const goToIntegrationWizardStep = useAppStore((s) => s.goToIntegrationWizardStep);
  const setEditingSetId = useAppStore((s) => s.setEditingSetId);

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

  const [isBuildingZip, setIsBuildingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState({
    current: 0,
    total: 1,
    message: "",
    packPercent: null as number | null,
  });

  const itemsRef = useRef(items);
  itemsRef.current = items;

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

  const handlePickFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    setGenericError(null);
    setVertexApiGate(null);

    const picked: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f) continue;
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      if (!ALLOWED_EXT.has(ext)) continue;
      if (f.size > 10 * 1024 * 1024) continue;
      picked.push(f);
    }

    if (picked.length === 0) {
      setGenericError(
        "Keine gueltigen Bilder (JPG, PNG, WebP, je max. 10 MB).",
      );
      return;
    }

    let batch = picked;
    if (batch.length > MAX_BATCH_FILES) {
      toast.error(
        `Maximal ${MAX_BATCH_FILES} Dateien pro Durchgang. Es werden nur die ersten ${MAX_BATCH_FILES} verwendet.`,
      );
      batch = batch.slice(0, MAX_BATCH_FILES);
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
  }, [revokeAllUrls]);

  const handleClearSelection = useCallback(() => {
    setItems((prev) => {
      revokeAllUrls(prev);
      return [];
    });
    setGenericError(null);
    setVertexApiGate(null);
    setShowResults(false);
  }, [revokeAllUrls]);

  const handleBatchUpscale = useCallback(async () => {
    if (!items.length || isProcessing) return;
    if (!vertexReady) {
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

    setIsProcessing(true);
    setProgressTotal(todo.length);
    setProgressIdx(0);

    await refreshAccessTokenIfExpiringSoon();

    let anySuccess = false;
    let vertexAborted = false;
    let successInThisRun = 0;

    try {
      for (let i = 0; i < todo.length; i++) {
        const { it, idx } = todo[i]!;
        setProgressIdx(i + 1);

        setItems((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx]!, status: "running" };
          return next;
        });

        try {
          const result = await upscaleImage(it.file, factor);
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
          if (e instanceof UpscaleVertexApiNotEnabledError) {
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

      if (anySuccess) {
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
      } else if (!vertexAborted) {
        toast.error("Kein Bild konnte verarbeitet werden.");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [items, factor, isProcessing, vertexReady]);

  const handleDownloadZip = useCallback(async () => {
    const done = items.filter((it) => it.status === "done" && it.resultBlob);
    if (!done.length) {
      toast.error("Keine fertigen Bilder fuer den ZIP-Download.");
      return;
    }
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
  }, [items]);

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

  // ── Empty: Dropzone ──
  if (items.length === 0) {
    return (
      <AppPage>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
            <Maximize size={24} className="text-indigo-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">KI Upscaler</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ein oder viele Bilder mit Imagen 4.0 hochskalieren — nacheinander
            verarbeitet. Bei einem Bild siehst du danach eine Vorher/Nachher-Ansicht,
            bei mehreren eine kompakte Ergebnisliste mit ZIP-Download.
          </p>
        </div>

        {vertexReady === false ? (
          <div
            role="status"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950"
          >
            <p className="font-medium">Vertex-Dienstkonto fehlt</p>
            <p className="mt-1 text-xs text-amber-900/90">
              Für den Upscaler brauchst du ein eigenes Google-Cloud-Dienstkonto
              (BYOK). Richte es im geführten Assistenten unter{" "}
              <span className="font-semibold">Schritt 3: Vertex AI</span> ein (oder unter
              Integrationen → Gemini (KI) → Vertex AI).
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

        <Dropzone
          title="Bilder hierher ziehen oder klicken"
          description={`JPG, PNG oder WebP — je max. 10 MB, bis ${MAX_BATCH_FILES} Dateien`}
          icon={<ImageUp size={32} className="text-slate-400" />}
          accept="image/jpeg,image/png,image/webp"
          multiple
          onPickFiles={handlePickFiles}
          onChange={(e) => handlePickFiles(e.target.files)}
          className="py-14"
        />

        {genericError ? <ErrorBanner message={genericError} /> : null}
      </div>
      </AppPage>
    );
  }

  // ── Queue + Ergebnis (Einzel: Slider, Mehrfach: Textliste + ZIP) ──
  return (
    <AppPage className="pb-10">
      {isBuildingZip ? (
        <BlockingProgressOverlay
          title="ZIP wird erstellt"
          message={zipProgress.message}
          current={zipProgress.current}
          total={zipProgress.total}
          packPercent={zipProgress.packPercent}
        />
      ) : null}
      {vertexApiGate ? (
        <VertexApiNotEnabledBox activationUrl={vertexApiGate} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleClearSelection}
          className="flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800"
        >
          <ArrowLeft size={16} /> Neue Auswahl
        </button>
        <p className="text-xs text-slate-500">
          {items.length} Datei(en)
          {doneCount > 0 ? ` · ${doneCount} fertig` : ""}
        </p>
      </div>

      {genericError ? <ErrorBanner message={genericError} /> : null}

      {!showResults ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                  disabled={isProcessing}
                  className={`rounded-lg border px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    factor === f
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  } disabled:opacity-50`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <ul className="divide-y divide-slate-100">
            {items.map((it) => {
              const mult = parseInt(factor.slice(1), 10);
              const targetW = it.originalWidth
                ? it.originalWidth * mult
                : null;
              const targetH = it.originalHeight
                ? it.originalHeight * mult
                : null;
              const needsTiling =
                targetW != null &&
                targetH != null &&
                targetW * targetH > MAX_OUTPUT_PIXELS;

              return (
                <li
                  key={it.id}
                  className="flex gap-4 px-5 py-4"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <img
                      src={it.previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {it.file.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {(it.file.size / (1024 * 1024)).toFixed(2)} MB
                      {it.status === "done" &&
                      it.upscaledWidth &&
                      it.upscaledHeight
                        ? ` → ${it.upscaledWidth}×${it.upscaledHeight}`
                        : null}
                    </p>
                    {needsTiling ? (
                      <p className="mt-1 text-xs text-amber-600">
                        Kachelverarbeitung (über 17 MP) – kann länger dauern.
                      </p>
                    ) : null}
                    {it.status === "error" && it.errorMessage ? (
                      <p className="mt-1 text-xs text-red-600">
                        {it.errorMessage}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 self-center text-xs">
                    {it.status === "pending" ? (
                      <span className="text-slate-400">Wartet</span>
                    ) : null}
                    {it.status === "running" ? (
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                    ) : null}
                    {it.status === "done" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : null}
                    {it.status === "error" ? (
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          {vertexReady === false ? (
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

          <div className="border-t border-slate-100 px-5 py-4">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-slate-600">
                  Fortschritt {progressIdx} / {progressTotal}
                </p>
                <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-indigo-100">
                  <div
                    className="studio-linear-bar-fill h-full rounded-full bg-indigo-600 transition-all"
                    style={{
                      width: progressTotal
                        ? `${Math.round((progressIdx / progressTotal) * 100)}%`
                        : "38%",
                    }}
                  />
                </div>
              </div>
            ) : (
              <Button
                onClick={() => void handleBatchUpscale()}
                className="w-full"
                disabled={vertexReady === false || pendingCount === 0}
              >
                <Maximize size={16} />
                {items.length === 1
                  ? "Upscale starten"
                  : `Alle hochskalieren (${pendingCount})`}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {showResults && doneCount > 0 && singlePreviewItem ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                  ) : (
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[10px] text-slate-400"
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
    className="rounded-xl border border-indigo-200 bg-indigo-50/90 px-4 py-4 text-sm text-indigo-950 shadow-sm"
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
      className="relative max-h-[70vh] select-none overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-lg"
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
        <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-white/90 shadow-lg backdrop-blur-sm">
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
      <div className="pointer-events-none absolute top-3 left-3 rounded-md bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
        Original
      </div>
      <div className="pointer-events-none absolute top-3 right-3 rounded-md bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
        Upscaled
      </div>
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
