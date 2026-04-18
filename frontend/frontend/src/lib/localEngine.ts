/**
 * Static download URL for the PyInstaller-built Local Engine (served from Vite `public/`).
 * Uses `import.meta.env.BASE_URL` so subpath deployments (e.g. /app/) still resolve correctly.
 */
const base = import.meta.env.BASE_URL;
const normalizedBase = base.endsWith("/") ? base : `${base}/`;

export const MOCKUP_LOCAL_ENGINE_HREF = `${normalizedBase}MockupLocalEngine.exe`;
