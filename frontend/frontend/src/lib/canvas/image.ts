const shouldUseCrossOrigin = (trimmed: string): boolean => {
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return false;
  }
  if (typeof window === "undefined") {
    return trimmed.startsWith("http://") || trimmed.startsWith("https://");
  }
  try {
    const u = new URL(trimmed, window.location.href);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return false;
    }
    // z.B. /media/… über Vite-Proxy = gleiche Origin wie die SPA
    return u.origin !== window.location.origin;
  } catch {
    return false;
  }
};

/**
 * Lädt ein Bild für die Canvas-Pipeline.
 * Cross-Origin nur wenn nötig; bei Fehler mit CORS einmal ohne wiederholen
 * (manche Hosts liefern kein ACAO, das Bild lädt dann trotzdem — Canvas kann ggf. „tainted“ sein).
 */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  const trimmed = src.trim();
  if (!trimmed) {
    return Promise.reject(new Error("Leere Bild-URL."));
  }

  return new Promise((resolve, reject) => {
    const run = (withCors: boolean) => {
      const img = new Image();
      if (withCors) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => resolve(img);
      img.onerror = () => {
        if (withCors) {
          run(false);
          return;
        }
        reject(
          new Error(
            "Bild konnte nicht geladen werden. Prüfe die URL, das Netzwerk oder CORS (z. B. R2-Bucket: erlaube deine SPA-Origin).",
          ),
        );
      };
      img.src = trimmed;
    };

    run(shouldUseCrossOrigin(trimmed));
  });
};

export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const res = await fetch(dataUrl);
  return res.blob();
};

export const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type = "image/png",
  quality?: number,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      type,
      quality,
    );
  });

export const compressImage = async (dataUrl: string): Promise<string> => {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const MAX_DIM = 2400;
  let scale = 1;
  if (img.width > MAX_DIM || img.height > MAX_DIM) {
    scale = Math.min(MAX_DIM / img.width, MAX_DIM / img.height);
  }
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
};

/**
 * Komprimiert ein File-Objekt für KI-Analyse (max 1200px, JPEG 0.75).
 * Gibt ein neues, kleineres File zurück – das Original bleibt unangetastet.
 */
export const compressFileForAI = async (
  file: File,
  maxEdge = 1200,
): Promise<File> => {
  const bmp = await createImageBitmap(file, {
    resizeWidth: maxEdge,
    resizeQuality: "high",
  });

  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bmp.close();
    return file;
  }
  ctx.drawImage(bmp, 0, 0);
  bmp.close();

  const blob = await canvasToBlob(canvas, "image/jpeg", 0.75);
  canvas.width = 0;
  canvas.height = 0;
  return new File([blob], file.name, { type: "image/jpeg" });
};

const previewBlobFromCanvas = async (canvas: HTMLCanvasElement, quality: number): Promise<string> => {
  const blob = await canvasToBlob(canvas, "image/jpeg", quality);
  return URL.createObjectURL(blob);
};

/**
 * Kleines Object-URL-JPEG für Listen-Thumbnails (nicht für Export).
 * Nutzt `createImageBitmap` mit Resize, damit der Browser nicht die volle Auflösung dekodieren muss.
 */
export const createArtworkPreviewObjectUrl = async (
  file: File,
  maxEdge = 384,
): Promise<string> => {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, {
        resizeWidth: maxEdge,
        resizeQuality: "high",
      });
      if (bmp.width < 1 || bmp.height < 1) {
        bmp.close();
        throw new Error("Leeres Bitmap");
      }
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        bmp.close();
        throw new Error("Kein 2D-Kontext");
      }
      ctx.drawImage(bmp, 0, 0);
      bmp.close();
      return await previewBlobFromCanvas(canvas, 0.82);
    } catch {
      /* Fallback unten */
    }
  }

  const blobUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(blobUrl);
    const scale = Math.min(1, maxEdge / img.width, maxEdge / img.height);
    const nw = Math.max(1, Math.round(img.width * scale));
    const nh = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = nw;
    canvas.height = nh;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(blobUrl);
      return URL.createObjectURL(file);
    }
    ctx.drawImage(img, 0, 0, nw, nh);
    URL.revokeObjectURL(blobUrl);
    return await previewBlobFromCanvas(canvas, 0.82);
  } catch {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch {
      /* ignore */
    }
    return URL.createObjectURL(file);
  }
};
