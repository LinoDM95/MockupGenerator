export const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const res = await fetch(dataUrl);
  return res.blob();
};

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
