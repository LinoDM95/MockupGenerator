import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";

import type {
  ArtworkMetadata,
  GelatoConnectionStatus,
  GelatoTemplate as GelatoTpl,
} from "../api/gelato";
import {
  gelatoListTemplates,
  gelatoStartExport,
  gelatoStatus,
} from "../api/gelato";
import { useLoadTemplateSets } from "../hooks/useLoadTemplateSets";
import { createArtworkPreviewObjectUrl, loadImage } from "../lib/canvas/image";
import { renderTemplateToCanvas } from "../lib/canvas/renderTemplate";
import { getErrorMessage } from "../lib/error";
import { sanitizeFileName } from "../lib/sanitize";
import { toast } from "../lib/toast";
import type { ArtworkItem } from "../types/mockup";
import { useAppStore } from "../store/appStore";
import { BatchQueue } from "./generator/BatchQueue";
import { ExportProgress } from "./gelato/ExportProgress";
import { GelatoExportModal } from "./gelato/GelatoExportModal";

export const GeneratorView = () => {
  const templateSets = useAppStore((s) => s.templateSets);
  const artworks = useAppStore((s) => s.artworks);
  const setArtworks = useAppStore((s) => s.setArtworks);
  const globalSetId = useAppStore((s) => s.globalSetId);
  const setGlobalSetId = useAppStore((s) => s.setGlobalSetId);
  useLoadTemplateSets({ silent: true });

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: "" });
  const [isPreparingPreviews, setIsPreparingPreviews] = useState(false);
  const previewJobsPendingRef = useRef(0);

  // Gelato state
  const [gelatoConn, setGelatoConn] = useState<GelatoConnectionStatus | null>(null);
  const [gelatoTemplates, setGelatoTemplates] = useState<GelatoTpl[]>([]);
  const [showGelatoModal, setShowGelatoModal] = useState(false);
  const [gelatoTaskIds, setGelatoTaskIds] = useState<string[]>([]);

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
    setIsGenerating(true);
    setProgress({ current: 0, total: artworks.length, message: "Initialisiere ZIP…" });
    try {
      const zip = new JSZip();
      for (let i = 0; i < artworks.length; i++) {
        const artwork = artworks[i];
        setProgress({
          current: i + 1,
          total: artworks.length,
          message: `Generiere: ${artwork.name}`,
        });
        const activeSet = templateSets.find((s) => s.id === artwork.setId);
        if (!activeSet || activeSet.templates.length === 0) continue;

        const cleanFolderName = sanitizeFileName(artwork.name);
        const artImg = await loadImage(artwork.url);
        const tplsToRender = mainOnly ? [activeSet.templates[0]] : activeSet.templates;

        if (mainOnly) {
          const tpl = tplsToRender[0];
          const canvas = await renderTemplateToCanvas(tpl, artImg, loadImage);
          const base64Data = canvas
            .toDataURL("image/jpeg", 0.85)
            .replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
          zip.file(`${cleanFolderName}.jpg`, base64Data, { base64: true });
        } else {
          const folder = zip.folder(cleanFolderName);
          if (!folder) continue;
          for (let t = 0; t < tplsToRender.length; t++) {
            const tpl = tplsToRender[t];
            const canvas = await renderTemplateToCanvas(tpl, artImg, loadImage);
            const base64Data = canvas
              .toDataURL("image/jpeg", 0.85)
              .replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
            const cleanTplName = sanitizeFileName(tpl.name) || "vorlage";
            const shortId = tpl.id.replace(/-/g, "").slice(0, 8);
            const fileName = `${String(t + 1).padStart(2, "0")}_${shortId}_${cleanTplName}.jpg`;
            folder.file(fileName, base64Data, { base64: true });
            await new Promise((r) => setTimeout(r, 10));
          }
        }
      }
      setProgress({
        current: artworks.length,
        total: artworks.length,
        message: "Packe ZIP-Datei…",
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const prefix = mainOnly ? "Gelato_Mockups" : "Etsy_Mockup_Batch";
      link.download = `${prefix}_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      setProgress({ current: 0, total: 0, message: "Fertig." });
      toast.success("ZIP wurde erstellt und heruntergeladen.");
    } catch (e) {
      console.error(e);
      toast.error(`Fehler: ${getErrorMessage(e)}`);
    } finally {
      setTimeout(() => setIsGenerating(false), 1500);
    }
  };

  const handleGelatoExportStart = useCallback(
    async (
      gelatoTemplateId: number,
      metadataList: ArtworkMetadata[],
      freeShipping: boolean,
      downloadZip: boolean,
    ) => {
      setShowGelatoModal(false);
      setIsGenerating(true);

      try {
        // ── ZIP erstellen (sequentiell, vor dem API-Export) ──
        if (downloadZip) {
          const zip = new JSZip();

          const items = artworks.map((art, idx) => ({
            art,
            title: metadataList[idx]?.title?.trim() || art.name,
          }));
          items.sort((a, b) => a.title.localeCompare(b.title, "de"));

          let rendered = 0;
          const totalMockups = items.reduce((sum, { art }) => {
            const set = templateSets.find((s) => s.id === art.setId);
            return sum + (set?.templates.length ?? 0);
          }, 0);

          for (let i = 0; i < items.length; i++) {
            const { art, title } = items[i];
            const activeSet = templateSets.find((s) => s.id === art.setId);
            if (!activeSet || activeSet.templates.length === 0) continue;

            const num = String(i + 1).padStart(2, "0");
            const cleanTitle = sanitizeFileName(title);
            const folderName = `${num}_${cleanTitle}`;
            const folder = zip.folder(folderName);
            if (!folder) continue;

            const artImg = await loadImage(art.url);

            for (let t = 0; t < activeSet.templates.length; t++) {
              const tpl = activeSet.templates[t];
              rendered++;
              setProgress({
                current: rendered,
                total: totalMockups,
                message: `Mockup ${rendered}/${totalMockups}: ${title}`,
              });
              const canvas = await renderTemplateToCanvas(tpl, artImg, loadImage);
              const base64Data = canvas
                .toDataURL("image/jpeg", 0.85)
                .replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
              const cleanTplName = sanitizeFileName(tpl.name) || "vorlage";
              const fileName = `${String(t + 1).padStart(2, "0")}_${cleanTplName}.jpg`;
              folder.file(fileName, base64Data, { base64: true });
              await new Promise((r) => setTimeout(r, 10));
            }
          }

          setProgress({ current: totalMockups, total: totalMockups, message: "Packe ZIP-Datei…" });
          const blob = await zip.generateAsync({ type: "blob" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `Gelato_Mockups_${Date.now()}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
          toast.success("Mockup-ZIP heruntergeladen.");
        }

        // ── Gelato-API-Export ──
        setProgress({ current: 0, total: artworks.length, message: "Sende Motive an Gelato…" });
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
        toast.error(`Gelato-Export fehlgeschlagen: ${getErrorMessage(e)}`);
      } finally {
        setIsGenerating(false);
        setProgress({ current: 0, total: 0, message: "" });
      }
    },
    [artworks, templateSets],
  );

  return (
    <div className="relative min-h-[min(80vh,720px)]">
      {isPreparingPreviews ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-4 rounded-xl bg-slate-900/50 backdrop-blur-sm"
        >
          <Loader2
            className="h-10 w-10 animate-spin text-white drop-shadow-md"
            strokeWidth={2}
            aria-hidden
          />
          <div className="text-center text-white drop-shadow-sm">
            <p className="text-base font-semibold tracking-tight">Bitte warte …</p>
            <p className="mt-1 text-sm text-white/80">Vorschaubilder werden vorbereitet.</p>
          </div>
        </div>
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
        onGenerate={generateBatchAndZIP}
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
