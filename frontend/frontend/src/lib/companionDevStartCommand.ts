/** Eine Zeile uvicorn; Projektroot = Ordner mit `companion_app/`. */
const UVICORN_CMD =
  "python -m uvicorn companion_app.main:app --host 127.0.0.1 --port 8001";

/**
 * Text fuer Zwischenablage (PowerShell / Terminal).
 * Optional: in `.env.local` `VITE_MOCKUP_REPO_ROOT=C:\\Pfad\\zu\\Mockup Generator`
 * setzen — dann enthaelt der Text ein passendes `cd`.
 */
export const getCompanionUvicornClipboardText = (): string => {
  const root = import.meta.env.VITE_MOCKUP_REPO_ROOT?.trim();
  if (root) {
    return `cd "${root}"\r\n${UVICORN_CMD}\r\n`;
  }
  return (
    `# Ins Projektverzeichnis wechseln (Ordner mit companion_app/), dann:\r\n` +
    `${UVICORN_CMD}\r\n`
  );
};
