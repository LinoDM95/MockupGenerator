import type { ChangeEvent } from "react";

/** Erste Dropzone (Leerzustand) — gleiche Mindesthöhe wie Generator/Upscaler. */
export const UPLOAD_QUEUE_INITIAL_DROPZONE_MIN_CLASS = "min-h-[200px]";

/**
 * Nach Dateiauswahl Input leeren, damit dieselbe Datei erneut gewählt werden kann.
 * Zentral für alle Dropzones mit `onChange`.
 */
export const resetFileInputOnPick = (
  e: ChangeEvent<HTMLInputElement>,
  onPick: (files: FileList | null) => void,
): void => {
  onPick(e.target.files);
  e.target.value = "";
};
