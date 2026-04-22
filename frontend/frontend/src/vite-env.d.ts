/// <reference types="vite/client" />

declare module "@fontsource-variable/inter";

interface ImportMetaEnv {
  /** Absoluter Pfad zum Repo-Root fuer optionalen cd-Zeile in Kopiertext. */
  readonly VITE_MOCKUP_REPO_ROOT?: string;
  /** Optional: Obergrenze Ausgabe-Pixel/Kachel (wie UPSCALE_MAX_OUTPUT_PIXELS im Backend). */
  readonly VITE_UPSCALE_MAX_OUTPUT_PIXELS?: string;
  /** Optional: API-Origin wenn SPA und API nicht gleiche Domain (z. B. https://api.example.com). */
  readonly VITE_API_BASE_URL?: string;
  /**
   * Optional: direkte Download-URL zur EXE (Build-Zeit). Wenn leer: `/api/public/printflow-engine/`.
   */
  readonly VITE_LOCAL_ENGINE_DOWNLOAD_URL?: string;
  /**
   * Setzt `StartMockupApp.bat` beim `npm run dev`: Upscaler zeigt PrintFlow Engine (lokal).
   * Ohne diese Variable bleibt nur die Cloud-Engine sichtbar.
   */
  readonly VITE_PRINTFLOW_LOCAL_STACK?: string;
  /** Anzeigename der App in Rechtstexten (Default: PrintFlow). */
  readonly VITE_APP_DISPLAY_NAME?: string;
  /** Impressum / Datenschutz: Firmen- oder Anbietername. */
  readonly VITE_LEGAL_ENTITY_NAME?: string;
  readonly VITE_LEGAL_ADDRESS_LINE1?: string;
  readonly VITE_LEGAL_ADDRESS_LINE2?: string;
  readonly VITE_LEGAL_COUNTRY?: string;
  readonly VITE_LEGAL_EMAIL?: string;
  readonly VITE_LEGAL_PHONE?: string;
  readonly VITE_LEGAL_REPRESENTATIVE?: string;
  readonly VITE_LEGAL_REGISTER_COURT?: string;
  readonly VITE_LEGAL_REGISTER_NUMBER?: string;
  readonly VITE_LEGAL_VAT_ID?: string;
  /** Freitext z. B. Kammer, Berufsbezeichnung, Regeln (mehrzeilig möglich). */
  readonly VITE_LEGAL_SUPERVISORY_NOTE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
