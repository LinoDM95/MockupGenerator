/**
 * Download-URL für die PrintFlow Engine (`PrintFlowEngine.exe`).
 *
 * - Standard: gleiche Origin, Django-Endpunkt `/api/public/printflow-engine/` — leitet auf
 *   `PRINTFLOW_ENGINE_DOWNLOAD_URL` um oder liefert die EXE aus `staticfiles`, wenn sie im Build war.
 * - Optional: `VITE_LOCAL_ENGINE_DOWNLOAD_URL` — direkte URL (Build-Zeit), z. B. wenn der Endpunkt
 *   nicht genutzt werden soll.
 */
export const PRINTFLOW_ENGINE_EXE_FILENAME = "PrintFlowEngine.exe";

const envDownload = import.meta.env.VITE_LOCAL_ENGINE_DOWNLOAD_URL?.trim();

/** Relativer Pfad zum Django-Download (Prod + Dev mit Proxy auf Port 8000). */
export const PRINTFLOW_ENGINE_DOWNLOAD_API_PATH = "/api/public/printflow-engine/";

/** @deprecated Bevorzugt `PRINTFLOW_ENGINE_DOWNLOAD_HREF` — Alias für bestehende Imports. */
export const MOCKUP_LOCAL_ENGINE_HREF =
  envDownload && envDownload.length > 0
    ? envDownload
    : PRINTFLOW_ENGINE_DOWNLOAD_API_PATH;

export const PRINTFLOW_ENGINE_DOWNLOAD_HREF = MOCKUP_LOCAL_ENGINE_HREF;
