/** Gemeinsame Regeln für Raster-Bild-Uploads (DRY). */

/** Kleinschreibung inkl. Punkt, z. B. `.png` */
export const fileExtensionLower = (name: string): string => {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i).toLowerCase();
};

export const RASTER_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

/** HTML-`accept` für Raster-Uploads (Dropzone / `<input type="file">`). */
export const RASTER_IMAGE_ACCEPT_HTML =
  "image/jpeg,image/png,image/webp" as const;

/** Generator: alle Bildtypen im Dateidialog. */
export const GENERATOR_IMAGE_ACCEPT_HTML = "image/*" as const;

/** Marketing erlaubt zusätzlich GIF (Animationen). */
export const MARKETING_IMAGE_EXTENSIONS = [...RASTER_IMAGE_EXTENSIONS, ".gif"] as const;

/** Upscaler: je Datei max. 10 MB (muss zum Backend passen). */
export const MAX_UPSCALER_IMAGE_BYTES = 10 * 1024 * 1024;

const asSet = (exts: readonly string[]) => new Set(exts);

export const UPSCALER_ALLOWED_EXT = asSet(RASTER_IMAGE_EXTENSIONS);
export const MARKETING_ALLOWED_EXT = asSet(MARKETING_IMAGE_EXTENSIONS);

export type FilterRasterFilesOptions = {
  allowedExt?: Set<string>;
  maxBytes?: number;
};

/**
 * Filtert eine File-Liste nach Extension und optional max. Größe.
 */
export const filterRasterImageFiles = (
  files: Iterable<File>,
  options: FilterRasterFilesOptions = {},
): File[] => {
  const allowed = options.allowedExt ?? UPSCALER_ALLOWED_EXT;
  const maxBytes = options.maxBytes;
  const out: File[] = [];
  for (const f of files) {
    const ext = fileExtensionLower(f.name);
    if (!allowed.has(ext)) continue;
    if (maxBytes !== undefined && f.size > maxBytes) continue;
    out.push(f);
  }
  return out;
};
