/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absoluter Pfad zum Repo-Root fuer optionalen cd-Zeile in Kopiertext. */
  readonly VITE_MOCKUP_REPO_ROOT?: string;
  /** Optional: Obergrenze Ausgabe-Pixel/Kachel (wie UPSCALE_MAX_OUTPUT_PIXELS im Backend). */
  readonly VITE_UPSCALE_MAX_OUTPUT_PIXELS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
