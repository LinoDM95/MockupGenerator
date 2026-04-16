import { Download, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";

import type {
  ArtworkMetadata,
  GelatoConnectionStatus,
  GelatoTemplate as GelatoTpl,
} from "../api/gelato";
import { refreshAccessTokenIfExpiringSoon } from "../api/client";
import {
  gelatoListTemplates,
  gelatoStartExport,
  gelatoStatus,
} from "../api/gelato";
import { useLoadTemplateSets } from "../hooks/useLoadTemplateSets";
import {
  canvasToJpegBlob,
  createArtworkPreviewObjectUrl,
  loadImage,
  releaseCanvas,
} from "../lib/canvas/image";
import { renderTemplateToCanvas } from "../lib/canvas/renderTemplate";
import { triggerAnchorDownload } from "../lib/download";
import {
  findTemplateSet,
  zipBlockReason,
  zipBlockToastMessage,
} from "../lib/generatorZipReadiness";
import { getErrorMessage } from "../lib/error";
import { sanitizeFileName } from "../lib/sanitize";
import { toast } from "../lib/toast";
import type { ArtworkItem } from "../types/mockup";
import { useAppStore } from "../store/appStore";
import { BatchQueue } from "./generator/BatchQueue";
import { ExportProgress } from "./gelato/ExportProgress";
import { GelatoExportModal } from "./gelato/GelatoExportModal";
import { BlockingProgressOverlay } from "./ui/BlockingProgressOverlay";
import { Button } from "./ui/Button";

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

export const GeneratorView = () => {
  const templateSets = useAppStore((s) => s.templateSets);
  const artworks = useAppStore((s) => s.artworks);
  const setArtworks = useAppStore((s) => s.setArtworks);
  const globalSetId = useAppStore((s) => s.globalSetId);
  const setGlobalSetId = useAppStore((s) => s.setGlobalSetId);
  const { reload: reloadTemplateSets } = useLoadTemplateSets({ silent: true });

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

  // Gelato state
  const [gelatoConn, setGelatoConn] = useState<GelatoConnectionStatus | null>(null);
  const [gelatoTemplates, setGelatoTemplates] = useState<GelatoTpl[]>([]);
  const [showGelatoModal, setShowGelatoModal] = useState(false);
  const [gelatoTaskIds, setGelatoTaskIds] = useState<string[]>([]);

  /** Gleicher Blob fuer manuellen Zweit-Download (frische User-Activation), falls Browser blockiert. */
  const [manualZipOffer, setManualZipOffer] = useState<{
    blob: Blob;
    filename: string;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const s = await gelatoStatus();
        setGelatoConn(s);
        if (s.connected) {
          const tpls = await gelatoListTemplates();
          setGelatoTemplates(tpls);
        }
      } catch {
        /* not connected */
      }
    })();
  }, []);

  const handleArtworkUpload = (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    const st = useAppStore.getState();
    const newItems: ArtworkItem[] = list.map((file) => ({
      id: `art_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      file,
      url: URL.createObjectURL(file),
      name: file.name.replace(/\.[^/.]+$/, ""),
      setId: st.globalSetId || templateSets[0]?.id || "",
    }));
    setArtworks((prev) => [...prev, ...newItems]);

    previewJobsPendingRef.current += 1;
    setIsPreparingPreviews(true);

    void (async () => {
      const previews = new Map<string, string>();
      try {
        for (const item of newItems) {
          try {
            const p = await createArtworkPreviewObjectUrl(item.file, 384);
            previews.set(item.id, p);
          } catch (e) {
            console.error("Vorschau fehlgeschlagen:", item.name, e);
          }
          await new Promise<void>((r) => {
            requestAnimationFrame(() => r());
          });
        }
        setArtworks((prev) => {
          const alive = new Set(prev.map((a) => a.id));
          for (const [id, p] of previews) {
            if (!alive.has(id)) URL.revokeObjectURL(p);
          }
          return prev.map((a) => {
            const p = previews.get(a.id);
            if (!p) return a;
            const stillSame = newItems.some((n) => n.id === a.id && n.url === a.url);
            if (!stillSame) return a;
            if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
            return { ...a, previewUrl: p };
          });
        });
      } finally {
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

  const generateBatchAndZIP = async (mainOnly = false) => {
    if (artworks.length === 0) return;
    await refreshAccessTokenIfExpiringSoon();
    await reloadTemplateSets();
    const sets = useAppStore.getState().templateSets;

    setManualZipOffer(null);
    setIsGenerating(true);
    setProgress({
      current: 0,
      total: 1,
      message: "Mockups werden gerendert …",
      packPercent: null,
    });

    let totalMockups = 0;
    for (const art of artworks) {
      const activeSet = findTemplateSet(art.setId, sets);
      if (!activeSet || activeSet.templates.length === 0) continue;
      totalMockups += mainOnly ? 1 : activeSet.templates.length;
    }

    if (totalMockups === 0) {
      toast.error(zipBlockToastMessage(zipBlockReason(artworks, sets)));
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, message: "", packPercent: null });
      return;
    }

    setProgress({
      current: 0,
      total: totalMockups,
      message: "Mockups werden gerendert …",
      packPercent: null,
    });

    try {
      const zip = new JSZip();
      let filesAdded = 0;
      let rendered = 0;

      for (let i = 0; i < artworks.length; i++) {
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
          const canvas = await renderTemplateToCanvas(tpl, artImg, loadImage);
          const blob = await canvasToJpegBlob(canvas, 0.85);
          releaseCanvas(canvas);
          zip.file(`${cleanFolderName}.jpg`, blob, JS_STORE);
          filesAdded += 1;
          await yieldToMain();
        } else {
          const folder = zip.folder(cleanFolderName);
          if (!folder) continue;
          for (let t = 0; t < tplsToRender.length; t++) {
            const tpl = tplsToRender[t]!;
            rendered += 1;
            setProgress({
              current: rendered,
              total: totalMockups,
              message: `Mockup ${rendered}/${totalMockups}: ${artwork.name}`,
              packPercent: null,
            });
            const canvas = await renderTemplateToCanvas(tpl, artImg, loadImage);
            const jpegBlob = await canvasToJpegBlob(canvas, 0.85);
            releaseCanvas(canvas);
            const cleanTplName = sanitizeFileName(tpl.name) || "vorlage";
            const shortId = tpl.id.replace(/-/g, "").slice(0, 8);
            const fileName = `${String(t + 1).padStart(2, "0")}_${shortId}_${cleanTplName}.jpg`;
            folder.file(fileName, jpegBlob, JS_STORE);
            filesAdded += 1;
            await yieldToMain();
          }
        }
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
      setIsGenerating(true);
      setProgress({
        current: 0,
        total: 1,
        message: downloadZip ? "Mockups werden gerendert …" : "Sende Motive an Gelato …",
        packPercent: null,
      });

      try {
        if (downloadZip) {
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

          for (let i = 0; i < items.length; i++) {
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
              const tpl = activeSet.templates[t]!;
              rendered += 1;
              setProgress({
                current: rendered,
                total: totalMockups,
                message: `Mockup ${rendered}/${totalMockups}: ${title}`,
                packPercent: null,
              });
              const canvas = await renderTemplateToCanvas(tpl, artImg, loadImage);
              const jpegBlob = await canvasToJpegBlob(canvas, 0.85);
              releaseCanvas(canvas);
              const cleanTplName = sanitizeFileName(tpl.name) || "vorlage";
              const fileName = `${String(t + 1).padStart(2, "0")}_${cleanTplName}.jpg`;
              folder.file(fileName, jpegBlob, JS_STORE);
              await yieldToMain();
            }
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
    [artworks, reloadTemplateSets],
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
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-sm"
          role="status"
        >
          <p className="min-w-0 flex-1">
            Kein Speichern-Dialog? Browser blockiert manchmal automatische Downloads nach
            langer Verarbeitung — hier erneut mit Klick starten:
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
              onClick={handleManualZipDownload}
            >
              <Download size={16} strokeWidth={2} aria-hidden />
              ZIP speichern
            </Button>
            <button
              type="button"
              onClick={() => setManualZipOffer(null)}
              className="rounded-lg p-2 text-amber-800 transition-colors hover:bg-amber-100"
              aria-label="Hinweis schliessen"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      ) : null}
      {isGenerating ? (
        <BlockingProgressOverlay
          title="Bitte warten"
          message={progress.message}
          current={progress.current}
          total={progress.total}
          packPercent={progress.packPercent}
        />
      ) : isPreparingPreviews ? (
        <BlockingProgressOverlay
          title="Bitte warte …"
          subtitle="Vorschaubilder werden vorbereitet."
          indeterminate
        />
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
          previewJobsPendingRef.current = 0;
          setIsPreparingPreviews(false);
          artworks.forEach((a) => {
            URL.revokeObjectURL(a.url);
            if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
          });
          setArtworks([]);
        }}
        isGenerating={isGenerating}
        progress={progress}
        inlineProgressMinimal={isGenerating}
        onGenerate={() => {
          void generateBatchAndZIP(false);
        }}
        gelatoConnected={!!gelatoConn?.connected}
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
