/**
 * Download-URL für die PrintFlow Engine (`PrintFlowEngine.exe`, Build-Zeit).
 *
 * - Standard: gleiche Origin wie die SPA, Pfad aus `BASE_URL` (Prod: `/static/PrintFlowEngine.exe`
 *   nach `collectstatic`, wenn die Datei in `public/` lag).
 * - Optional: `VITE_LOCAL_ENGINE_DOWNLOAD_URL` — volle oder absolute URL, z. B. Release-Asset oder S3,
 *   wenn die EXE nicht im Repo/`public/` liegt (z. B. wegen .gitignore auf Render).
 */
export const PRINTFLOW_ENGINE_EXE_FILENAME = "PrintFlowEngine.exe";

const base = import.meta.env.BASE_URL;
const normalizedBase = base.endsWith("/") ? base : `${base}/`;

const envDownload = import.meta.env.VITE_LOCAL_ENGINE_DOWNLOAD_URL?.trim();

/** @deprecated Bevorzugt `PRINTFLOW_ENGINE_DOWNLOAD_HREF` — Alias für bestehende Imports. */
export const MOCKUP_LOCAL_ENGINE_HREF =
  envDownload && envDownload.length > 0
    ? envDownload
    : `${normalizedBase}${PRINTFLOW_ENGINE_EXE_FILENAME}`;

export const PRINTFLOW_ENGINE_DOWNLOAD_HREF = MOCKUP_LOCAL_ENGINE_HREF;
