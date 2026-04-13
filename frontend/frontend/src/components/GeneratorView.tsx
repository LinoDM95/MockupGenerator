import { useEffect, useState } from "react";
import JSZip from "jszip";

import { fetchTemplateSets } from "../api/sets";
import { useCanvasRender } from "../hooks/useCanvasRender";
import { toast } from "../lib/toast";
import type { ArtworkItem, FrameStyle } from "../types/mockup";
import { useAppStore } from "../store/appStore";
import { BatchQueue } from "./generator/BatchQueue";

export const GeneratorView = () => {
  const templateSets = useAppStore((s) => s.templateSets);
  const artworks = useAppStore((s) => s.artworks);
  const setArtworks = useAppStore((s) => s.setArtworks);
  const globalSetId = useAppStore((s) => s.globalSetId);
  const globalFrameStyle = useAppStore((s) => s.globalFrameStyle);
  const setGlobalSetId = useAppStore((s) => s.setGlobalSetId);
  const setGlobalFrameStyle = useAppStore((s) => s.setGlobalFrameStyle);
  const setTemplateSets = useAppStore((s) => s.setTemplateSets);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchTemplateSets();
        if (cancelled) return;
        setTemplateSets(data);
        const st = useAppStore.getState();
        if (data.length && !st.globalSetId) st.setGlobalSetId(data[0].id);
      } catch (e) {
        console.error("Sets für Generator laden fehlgeschlagen:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setTemplateSets]);

  const { loadImage, renderElementToCanvas } = useCanvasRender();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: "" });

  const handleArtworkUpload = (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    const newItems: ArtworkItem[] = list.map((file) => ({
      id: `art_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      file,
      url: URL.createObjectURL(file),
      name: file.name.replace(/\.[^/.]+$/, ""),
      setId: globalSetId || templateSets[0]?.id || "",
      frameStyle: globalFrameStyle,
    }));
    setArtworks((prev) => [...prev, ...newItems]);
  };

  const removeArtwork = (id: string) => {
    setArtworks((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter((a) => a.id !== id);
    });
  };

  const updateArtwork = (id: string, key: keyof ArtworkItem, value: string) => {
    setArtworks((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [key]: value } as ArtworkItem : a)),
    );
  };

  const applyGlobalSettings = () => {
    setArtworks((prev) =>
      prev.map((a) => ({ ...a, setId: globalSetId, frameStyle: globalFrameStyle })),
    );
  };

  const generateBatchAndZIP = async () => {
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

        const cleanFolderName = artwork.name.replace(/[^a-zA-Z0-9_-]/g, "_");
        const folder = zip.folder(cleanFolderName);
        if (!folder) continue;
        const artImg = await loadImage(artwork.url);

        for (let t = 0; t < activeSet.templates.length; t++) {
          const tpl = activeSet.templates[t];
          const canvas = document.createElement("canvas");
          canvas.width = tpl.width;
          canvas.height = tpl.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          const bgImg = await loadImage(tpl.bgImage);
          ctx.drawImage(bgImg, 0, 0, tpl.width, tpl.height);
          for (const el of tpl.elements) {
            renderElementToCanvas(ctx, el, artImg, artwork.frameStyle as FrameStyle);
          }
          const base64Data = canvas
            .toDataURL("image/jpeg", 0.85)
            .replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
          const cleanTplName = tpl.name.replace(/[^a-zA-Z0-9_-]/g, "_") || "vorlage";
          const shortId = tpl.id.replace(/-/g, "").slice(0, 8);
          const fileName = `${String(t + 1).padStart(2, "0")}_${shortId}_${cleanTplName}.jpg`;
          folder.file(fileName, base64Data, { base64: true });
          await new Promise((r) => setTimeout(r, 10));
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
      link.download = `Etsy_Mockup_Batch_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      setProgress({ current: 0, total: 0, message: "Fertig." });
      toast.success("ZIP wurde erstellt und heruntergeladen.");
    } catch (e) {
      console.error(e);
      toast.error(`Fehler: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTimeout(() => setIsGenerating(false), 1500);
    }
  };

  return (
    <BatchQueue
      onFiles={handleArtworkUpload}
      artworks={artworks}
      templateSets={templateSets}
      globalSetId={globalSetId}
      globalFrameStyle={globalFrameStyle}
      onGlobalSetId={setGlobalSetId}
      onGlobalFrameStyle={setGlobalFrameStyle}
      onApplyGlobal={applyGlobalSettings}
      onUpdateArtwork={updateArtwork}
      onRemoveArtwork={removeArtwork}
      onClearAll={() => {
        artworks.forEach((a) => URL.revokeObjectURL(a.url));
        setArtworks([]);
      }}
      isGenerating={isGenerating}
      progress={progress}
      onGenerate={generateBatchAndZIP}
    />
  );
};
