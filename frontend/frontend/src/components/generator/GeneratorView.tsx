import { CheckCircle2, Download, Loader2, X } from "lucide-react";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ArtworkMetadata, GelatoTemplate as GelatoTpl } from "../../api/gelato";
import { refreshAccessTokenIfExpiringSoon } from "../../api/client";
import {
  fetchGelatoListTemplates,
  fetchGelatoStatus,
  gelatoStartExport,
} from "../../api/gelato";
import { useLoadTemplateSets } from "../../hooks/useLoadTemplateSets";
import {
  canvasToJpegBlob,
  createArtworkPreviewObjectUrl,
  loadImage,
  releaseCanvas,
} from "../../lib/canvas/image";
import { renderTemplateToCanvas } from "../../lib/canvas/renderTemplate";
import { triggerAnchorDownload } from "../../lib/common/download";
import {
  findTemplateSet,
  zipBlockReason,
  zipBlockToastMessage,
} from "../../lib/generator/generatorZipReadiness";
import { getErrorMessage } from "../../lib/common/error";
import { sanitizeFileName } from "../../lib/common/sanitize";
import { toast } from "../../lib/ui/toast";
import type { ArtworkItem } from "../../types/mockup";
import { useWorkSessionEta } from "../../hooks/useWorkSessionEta";
import { useAppStore } from "../../store/appStore";
import { ArtworkListThumbnail } from "./ArtworkListThumbnail";
import { BatchQueue } from "./BatchQueue";
import { ExportProgress } from "../gelato/ExportProgress";
import { GelatoExportModal } from "../gelato/GelatoExportModal";
import { Button } from "../ui/primitives/Button";
import { WorkSessionShell } from "../ui/workSession/WorkSessionShell";

const yieldToMain = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

const mockupExportErrorMessage = (e: unknown): string => {
  if (e instanceof DOMException && e.name === "SecurityError") {
    return (
      "Der Browser blockiert den Export: Ein Vorlagen-Hintergrundbild kommt von einer anderen Domain ohne CORS. " +
      "Bitte Mockup-Hintergründe über dieselbe Quelle wie die App laden oder im Vorlagen-Editor prüfen."
    );
  }
  return getErrorMessage(e);
};

const JS_STORE = { compression: "STORE" as const };

/** Listen-Thumbnails: klein genug für schnelles createImageBitmap, nicht die volle Datei im <img>. */
const PREVIEW_MAX_EDGE = 256;
/** Parallelität Vorschau-Jobs — höher = schneller fertig, mehr CPU/GPU-Decode-Last. */
const PREVIEW_CONCURRENCY = 4;

export const GeneratorView = () => {
  const templateSets = useAppStore((s) => s.templateSets);
  const artworks = useAppStore((s) => s.artworks);
  const setArtworks = useAppStore((s) => s.setArtworks);
  const globalSetId = useAppStore((s) => s.globalSetId);
  const setGlobalSetId = useAppStore((s) => s.setGlobalSetId);
  const setNavigationLocked = useAppStore((s) => s.setNavigationLocked);
  const openConfirm = useAppStore((s) => s.openConfirm);
  const { reload: reloadTemplateSets } = useLoadTemplateSets({ silent: true });

  const { recordSample, reset: resetEta, getRemainingLabel } = useWorkSessionEta();
  const cancelGenerateRef = useRef(false);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void reloadTemplateSets();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [reloadTemplateSets]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    message: "",
    packPercent: null as number | null,
  });
  const [isPreparingPreviews, setIsPreparingPreviews] = useState(false);
  const previewJobsPendingRef = useRef(0);
  const previewAbortControllersRef = useRef<AbortController[]>([]);

  useEffect(() => {
    if (isGenerating || isPreparingPreviews) {
      setNavigationLocked(true);
    } else {
      setNavigationLocked(false);
    }
  }, [isGenerating, isPreparingPreviews, setNavigationLocked]);

  // Gelato state
  const [gelatoPhase, setGelatoPhase] = useState<"unknown" | "ready" | "missing">(
    "unknown",
  );
  const [gelatoTemplates, setGelatoTemplates] = useState<GelatoTpl[]>([]);
  const [showGelatoModal, setShowGelatoModal] = useState(false);
  const [gelatoTaskIds, setGelatoTaskIds] = useState<string[]>([]);

  /** Gleicher Blob fuer manuellen Zweit-Download (frische User-Activation), falls Browser blockiert. */
  const [manualZipOffer, setManualZipOffer] = useState<{
    blob: Blob;
    filename: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await fetchGelatoStatus();
        if (cancelled) return;
        if (s.connected) {
          const tpls = await fetchGelatoListTemplates();
          if (cancelled) return;
          setGelatoTemplates(tpls);
          setGelatoPhase("ready");
        } else {
          setGelatoTemplates([]);
          setGelatoPhase("missing");
        }
      } catch {
        if (!cancelled) {
          setGelatoTemplates([]);
          setGelatoPhase("missing");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleArtworkUpload = (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    const st = useAppStore.getState();
    // `file` + `url` bleiben die volle Auflösung für loadImage/render; nur `previewUrl` ist klein.
    const newItems: ArtworkItem[] = list.map((file) => ({
      id: `art_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      file,
      url: URL.createObjectURL(file),
      name: file.name.replace(/\.[^/.]+$/, ""),
      setId: st.globalSetId || templateSets[0]?.id || "",
    }));
    startTransition(() => {
      setArtworks((prev) => [...prev, ...newItems]);
    });

    previewJobsPendingRef.current += 1;
    setIsPreparingPreviews(true);

    const ac = new AbortController();
    previewAbortControllersRef.current.push(ac);
    const signal = ac.signal;

    void (async () => {
      try {
        const queue = [...newItems];
        const previewOne = async (item: ArtworkItem) => {
          if (signal.aborted) return;
          try {
            const p = await createArtworkPreviewObjectUrl(item.file, PREVIEW_MAX_EDGE);
            if (signal.aborted) {
              URL.revokeObjectURL(p);
              return;
            }
            setArtworks((prev) => {
              const row = prev.find((a) => a.id === item.id);
              if (!row) {
                URL.revokeObjectURL(p);
                return prev;
              }
              return prev.map((a) => {
                if (a.id !== item.id) return a;
                if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
                return { ...a, previewUrl: p };
              });
            });
          } catch (e) {
            console.error("Vorschau fehlgeschlagen:", item.name, e);
          }
        };

        const worker = async () => {
          while (queue.length > 0 && !signal.aborted) {
            const item = queue.shift();
            if (!item) break;
            await previewOne(item);
          }
        };

        await Promise.all(
          Array.from({ length: PREVIEW_CONCURRENCY }, () => worker()),
        );
      } finally {
        previewAbortControllersRef.current = previewAbortControllersRef.current.filter(
          (c) => c !== ac,
        );
        previewJobsPendingRef.current = Math.max(0, previewJobsPendingRef.current - 1);
        if (previewJobsPendingRef.current === 0) setIsPreparingPreviews(false);
      }
    })();
  };

  const removeArtwork = (id: string) => {
    setArtworks((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item) {
        URL.revokeObjectURL(item.url);
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const updateArtwork = (id: string, key: keyof ArtworkItem, value: string) => {
    setArtworks((prev) =>
      prev.map((a) => (a.id === id ? ({ ...a, [key]: value } as ArtworkItem) : a)),
    );
  };

  const applyGlobalSettings = () => {
    setArtworks((prev) => prev.map((a) => ({ ...a, setId: globalSetId })));
  };

  const generatorFooterEta = useMemo(() => {
    if (!isGenerating || progress.packPercent != null) return null;
    if (progress.total <= 0) return null;
    return getRemainingLabel(Math.max(0, progress.total - progress.current));
  }, [
    isGenerating,
    progress.current,
    progress.total,
    progress.packPercent,
    getRemainingLabel,
  ]);

  const handleAbortGenerate = useCallback(async () => {
    const ok = await openConfirm(
      "Wirklich abbrechen? Bereits gerenderte Mockups werden als ZIP angeboten, der Rest entfällt.",
    );
    if (!ok) return;
    cancelGenerateRef.current = true;
  }, [openConfirm]);

  const handleAbortPreviews = useCallback(async () => {
    const ok = await openConfirm(
      "Vorschau-Erstellung abbrechen? Bereits fertige Vorschaubilder bleiben erhalten; der Rest wird ohne Listen-Vorschau angezeigt.",
    );
    if (!ok) return;
    previewAbortControllersRef.current.forEach((c) => c.abort());
  }, [openConfirm]);

  const generateBatchAndZIP = async (mainOnly = false) => {
    if (artworks.length === 0) return;
    await refreshAccessTokenIfExpiringSoon();
    await reloadTemplateSets();
    const sets = useAppStore.getState().templateSets;

    let totalMockups = 0;
    for (const art of artworks) {
      const activeSet = findTemplateSet(art.setId, sets);
      if (!activeSet || activeSet.templates.length === 0) continue;
      totalMockups += mainOnly ? 1 : activeSet.templates.length;
    }

    if (totalMockups === 0) {
      toast.error(zipBlockToastMessage(zipBlockReason(artworks, sets)));
      return;
    }

    cancelGenerateRef.current = false;
    resetEta();
    setManualZipOffer(null);
    setIsGenerating(true);
    setProgress({
      current: 0,
      total: totalMockups,
      message: "Mockups werden gerendert …",
      packPercent: null,
    });

    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      let filesAdded = 0;
      let rendered = 0;

      batch: for (let i = 0; i < artworks.length; i++) {
        if (cancelGenerateRef.current) break batch;
        const artwork = artworks[i];
        const activeSet = findTemplateSet(artwork.setId, sets);
        if (!activeSet || activeSet.templates.length === 0) continue;

        const cleanFolderName = sanitizeFileName(artwork.name);
        const artImg = await loadImage(artwork.url);
        const tplsToRender = mainOnly ? [activeSet.templates[0]!] : activeSet.templates;

        if (mainOnly) {
          const tpl = tplsToRender[0]!;
          rendered += 1;
          setProgress({
            current: rendered,
            total: totalMockups,
            message: `Mockup ${rendered}/${totalMockups}: ${artwork.name}`,
            packPercent: null,
          });
          const t0 = performance.now();
          const canvas = await renderTemplateToCanvas(tpl, artImg, loadImage);
          const blob = await canvasToJpegBlob(canvas, 0.85);
          releaseCanvas(canvas);
          recordSample(performance.now() - t0);
          zip.file(`${cleanFolderName}.jpg`, blob, JS_STORE);
          filesAdded += 1;
          await yieldToMain();
          if (cancelGenerateRef.current) break batch;
        } else {
          const folder = zip.folder(cleanFolderName);
          if (!folder) continue;
          for (let t = 0; t < tplsToRender.length; t++) {
            if (cancelGenerateRef.current) break batch;
            const tpl = tplsToRender[t]!;
            rendered += 1;
            setProgress({
              current: rendered,
              total: totalMockups,
              message: `Mockup ${rendered}/${totalMockups}: ${artwork.name}`,
              packPercent: null,
            });
            const t0 = performance.now();
            const canvas = await renderTemplateToCanvas(tpl, artImg, loadImage);
            const jpegBlob = await canvasToJpegBlob(canvas, 0.85);
            releaseCanvas(canvas);
            recordSample(performance.now() - t0);
            const cleanTplName = sanitizeFileName(tpl.name) || "vorlage";
            const shortId = tpl.id.replace(/-/g, "").slice(0, 8);
            const fileName = `${String(t + 1).padStart(2, "0")}_${shortId}_${cleanTplName}.jpg`;
            folder.file(fileName, jpegBlob, JS_STORE);
            filesAdded += 1;
            await yieldToMain();
          }
        }
      }

      if (cancelGenerateRef.current) {
        if (filesAdded === 0) {
          toast.error("Abgebrochen — es waren noch keine Mockups fertig.");
          return;
        }
        setProgress({
          current: totalMockups,
          total: totalMockups,
          message: "ZIP wird gepackt …",
          packPercent: 0,
        });
        const blob = await zip.generateAsync({ type: "blob" }, (meta) => {
          if (meta.percent != null) {
            setProgress((prev) => ({
              ...prev,
              packPercent: meta.percent,
              message: `ZIP wird gepackt … ${Math.round(meta.percent)}%`,
            }));
          }
        });
        const prefix = mainOnly ? "Gelato_Mockups" : "Etsy_Mockup_Batch";
        const filename = `${prefix}_partial_${Date.now()}.zip`;
        triggerAnchorDownload(blob, filename);
        setManualZipOffer({ blob, filename });
        toast.success(
          "Abgebrochen — ZIP mit den fertigen Mockups wurde erstellt.",
        );
        return;
      }

      if (filesAdded === 0) {
        toast.error(zipBlockToastMessage(zipBlockReason(artworks, sets)));
        return;
      }

      setProgress({
        current: totalMockups,
        total: totalMockups,
        message: "ZIP wird gepackt …",
        packPercent: 0,
      });

      const blob = await zip.generateAsync({ type: "blob" }, (meta) => {
        if (meta.percent != null) {
          setProgress((prev) => ({
            ...prev,
            packPercent: meta.percent,
            message: `ZIP wird gepackt … ${Math.round(meta.percent)}%`,
          }));
        }
      });

      const prefix = mainOnly ? "Gelato_Mockups" : "Etsy_Mockup_Batch";
      const filename = `${prefix}_${Date.now()}.zip`;
      triggerAnchorDownload(blob, filename);
      setManualZipOffer({ blob, filename });
      toast.success("ZIP wurde erstellt. Speichern-Dialog sollte erscheinen — sonst Button unten.");
    } catch (e) {
      console.error(e);
      toast.error(`Fehler: ${mockupExportErrorMessage(e)}`);
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, message: "", packPercent: null });
    }
  };

  const handleGelatoExportStart = useCallback(
    async (
      gelatoTemplateId: number,
      metadataList: ArtworkMetadata[],
      freeShipping: boolean,
      downloadZip: boolean,
    ) => {
      await refreshAccessTokenIfExpiringSoon();
      await reloadTemplateSets();
      const sets = useAppStore.getState().templateSets;

      setShowGelatoModal(false);
      setManualZipOffer(null);
      cancelGenerateRef.current = false;
      resetEta();
      setIsGenerating(true);
      setProgress({
        current: 0,
        total: 1,
        message: downloadZip ? "Mockups werden gerendert …" : "Sende Motive an Gelato …",
        packPercent: null,
      });

      try {
        if (downloadZip) {
          const { default: JSZip } = await import("jszip");
          const zip = new JSZip();

          const items = artworks.map((art, idx) => ({
            art,
            title: metadataList[idx]?.title?.trim() || art.name,
          }));
          items.sort((a, b) => a.title.localeCompare(b.title, "de"));

          let rendered = 0;
          const totalMockups = items.reduce((sum, { art }) => {
            const set = findTemplateSet(art.setId, sets);
            return sum + (set?.templates.length ?? 0);
          }, 0);

          if (totalMockups > 0) {
            setProgress({
              current: 0,
              total: totalMockups,
              message: "Mockups werden gerendert …",
              packPercent: null,
            });
          }

          gelatoZip: for (let i = 0; i < items.length; i++) {
            if (cancelGenerateRef.current) break gelatoZip;
            const { art, title } = items[i]!;
            const activeSet = findTemplateSet(art.setId, sets);
            if (!activeSet || activeSet.templates.length === 0) continue;

            const num = String(i + 1).padStart(2, "0");
            const cleanTitle = sanitizeFileName(title);
            const folderName = `${num}_${cleanTitle}`;
            const folder = zip.folder(folderName);
            if (!folder) continue;

            const artImg = await loadImage(art.url);

            for (let t = 0; t < activeSet.templates.length; t++) {
              if (cancelGenerateRef.current) break gelatoZip;
              const tpl = activeSet.templates[t]!;
              rendered += 1;
              setProgress({
                current: rendered,
                total: totalMockups,
                message: `Mockup ${rendered}/${totalMockups}: ${title}`,
                packPercent: null,
              });
              const t0 = performance.now();
              const canvas = await renderTemplateToCanvas(tpl, artImg, loadImage);
              const jpegBlob = await canvasToJpegBlob(canvas, 0.85);
              releaseCanvas(canvas);
              recordSample(performance.now() - t0);
              const cleanTplName = sanitizeFileName(tpl.name) || "vorlage";
              const fileName = `${String(t + 1).padStart(2, "0")}_${cleanTplName}.jpg`;
              folder.file(fileName, jpegBlob, JS_STORE);
              await yieldToMain();
            }
          }

          if (cancelGenerateRef.current) {
            if (rendered > 0) {
              setProgress({
                current: totalMockups,
                total: totalMockups,
                message: "ZIP wird gepackt …",
                packPercent: 0,
              });
              const blob = await zip.generateAsync({ type: "blob" }, (meta) => {
                if (meta.percent != null) {
                  setProgress((prev) => ({
                    ...prev,
                    packPercent: meta.percent,
                    message: `ZIP wird gepackt … ${Math.round(meta.percent)}%`,
                  }));
                }
              });
              const filename = `Gelato_Mockups_partial_${Date.now()}.zip`;
              triggerAnchorDownload(blob, filename);
              setManualZipOffer({ blob, filename });
              toast.success(
                "Abgebrochen — ZIP mit den fertigen Mockups wurde erstellt.",
              );
            } else {
              toast.error("Abgebrochen — es waren noch keine Mockups fertig.");
            }
            return;
          }

          if (rendered === 0) {
            toast.error(zipBlockToastMessage(zipBlockReason(artworks, sets)));
          } else {
            setProgress({
              current: totalMockups,
              total: totalMockups,
              message: "ZIP wird gepackt …",
              packPercent: 0,
            });
            const blob = await zip.generateAsync({ type: "blob" }, (meta) => {
              if (meta.percent != null) {
                setProgress((prev) => ({
                  ...prev,
                  packPercent: meta.percent,
                  message: `ZIP wird gepackt … ${Math.round(meta.percent)}%`,
                }));
              }
            });
            const filename = `Gelato_Mockups_${Date.now()}.zip`;
            triggerAnchorDownload(blob, filename);
            setManualZipOffer({ blob, filename });
            toast.success(
              "Mockup-ZIP erstellt. Speichern-Dialog sollte erscheinen — sonst Button unten.",
            );
          }
        }

        if (cancelGenerateRef.current) return;

        setProgress({
          current: 0,
          total: artworks.length,
          message: "Sende Motive an Gelato …",
          packPercent: null,
        });
        const artworkFiles = artworks.map((a) => a.file);
        const tasks = await gelatoStartExport(
          gelatoTemplateId,
          artworkFiles,
          metadataList,
          freeShipping,
        );
        const ids = tasks.map((t) => t.id);
        setGelatoTaskIds(ids);
        toast.success(`${ids.length} Designs an Gelato gesendet (Draft).`);
      } catch (e) {
        console.error(e);
        toast.error(`Gelato-Export fehlgeschlagen: ${mockupExportErrorMessage(e)}`);
      } finally {
        setIsGenerating(false);
        setProgress({ current: 0, total: 0, message: "", packPercent: null });
      }
    },
    [artworks, reloadTemplateSets, recordSample, resetEta],
  );

  const handleManualZipDownload = useCallback(() => {
    if (!manualZipOffer) return;
    triggerAnchorDownload(manualZipOffer.blob, manualZipOffer.filename);
    toast.success("Download gestartet.");
  }, [manualZipOffer]);

  return (
    <div className="relative min-h-[min(80vh,720px)]">
      {manualZipOffer ? (
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-500/20 dark:ring-amber-400/30"
          role="status"
        >
          <p className="min-w-0 flex-1 font-medium">
            Kein Speichern-Dialog? Browser blockiert manchmal automatische Downloads nach
            langer Verarbeitung — hier erneut mit Klick starten:
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-amber-300 bg-white text-amber-900 hover:bg-amber-100 dark:border-amber-500/45 dark:bg-amber-100/15 dark:text-amber-50 dark:hover:bg-amber-100/25"
              onClick={handleManualZipDownload}
            >
              <Download size={16} strokeWidth={2} aria-hidden />
              ZIP speichern
            </Button>
            <button
              type="button"
              onClick={() => setManualZipOffer(null)}
              className="rounded-lg p-2 text-amber-900 transition-colors hover:bg-amber-100 dark:text-amber-50 dark:hover:bg-amber-100/20"
              aria-label="Hinweis schliessen"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      ) : null}
      {isGenerating || isPreparingPreviews ? (
        <WorkSessionShell
          title="Generator"
          subtitle={
            isGenerating
              ? "Mockups werden gerendert und anschließend gezippt."
              : "Vorschaubilder werden aus deinen Motiven erzeugt."
          }
          message={
            isGenerating
              ? progress.message
              : "Thumbnails werden erstellt — bitte kurz warten."
          }
          current={isGenerating ? progress.current : 0}
          total={isGenerating ? Math.max(1, progress.total) : 1}
          packPercent={isGenerating ? progress.packPercent : null}
          indeterminate={!isGenerating}
          etaLabel={isGenerating ? generatorFooterEta : null}
          abortLabel={
            isPreparingPreviews && !isGenerating ? "Vorschau abbrechen" : undefined
          }
          onAbort={
            isGenerating
              ? handleAbortGenerate
              : isPreparingPreviews
                ? handleAbortPreviews
                : undefined
          }
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[rgb(255_255_255/0.15)] bg-work-session-panel shadow-work-session-panel ring-1 ring-work-session-panel">
              <div className="shrink-0 border-b border-work-session-hairline px-4 py-3">
                <p className="text-work-session-lead-muted text-xs font-medium">Motive</p>
                <p className="text-work-session-lead text-sm">
                  {artworks.length} Datei(en) in der Warteschlange
                </p>
              </div>
              <div
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
                aria-label="Liste der Motive"
              >
                <ul className="divide-y divide-[rgb(255_255_255/0.1)]">
                  {artworks.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                      <ArtworkListThumbnail
                        previewUrl={a.previewUrl}
                        variant="dark"
                        className="h-12 w-12"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-work-session-title truncate text-sm font-medium">
                          {a.name}
                        </p>
                        <p className="text-work-session-lead-muted text-xs">
                          {isGenerating
                            ? "In der Warteschlange"
                            : a.previewUrl
                              ? "Vorschau bereit"
                              : "Vorschau wird erstellt …"}
                        </p>
                      </div>
                      {isGenerating ? (
                        <Loader2
                          className="h-5 w-5 shrink-0 animate-spin text-violet-300"
                          aria-hidden
                        />
                      ) : a.previewUrl ? (
                        <CheckCircle2
                          className="h-5 w-5 shrink-0 text-emerald-400"
                          aria-hidden
                        />
                      ) : (
                        <Loader2
                          className="h-5 w-5 shrink-0 animate-spin text-violet-300"
                          aria-hidden
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </WorkSessionShell>
      ) : null}
      <BatchQueue
        onFiles={handleArtworkUpload}
        artworks={artworks}
        templateSets={templateSets}
        globalSetId={globalSetId}
        onGlobalSetId={setGlobalSetId}
        onApplyGlobal={applyGlobalSettings}
        onUpdateArtwork={updateArtwork}
        onRemoveArtwork={removeArtwork}
        onClearAll={() => {
          previewAbortControllersRef.current.forEach((c) => c.abort());
          previewAbortControllersRef.current = [];
          previewJobsPendingRef.current = 0;
          setIsPreparingPreviews(false);
          artworks.forEach((a) => {
            URL.revokeObjectURL(a.url);
            if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
          });
          setArtworks([]);
        }}
        isGenerating={isGenerating || isPreparingPreviews}
        progress={progress}
        inlineProgressMinimal={isGenerating || isPreparingPreviews}
        onGenerate={() => {
          void generateBatchAndZIP(false);
        }}
        gelatoPhase={gelatoPhase}
        onGelatoExport={() => setShowGelatoModal(true)}
      />

      {showGelatoModal && (
        <GelatoExportModal
          templates={gelatoTemplates}
          artworks={artworks}
          onClose={() => setShowGelatoModal(false)}
          onExport={handleGelatoExportStart}
        />
      )}

      {gelatoTaskIds.length > 0 && (
        <ExportProgress
          taskIds={gelatoTaskIds}
          onClose={() => setGelatoTaskIds([])}
        />
      )}
    </div>
  );
};
