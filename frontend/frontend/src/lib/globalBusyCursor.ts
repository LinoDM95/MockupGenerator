/**
 * Globaler Warte-Cursor (System-Glyph „wait“) bei laufenden API-Requests.
 * Kurze Verzögerung, damit schnelle Calls nicht flackern.
 */

const API_BUSY_CLASS = "app-global-busy";
const BUSY_SHOW_DELAY_MS = 120;

let apiInFlight = 0;
let showTimer: ReturnType<typeof setTimeout> | null = null;

const shouldSkipPath = (path: string): boolean => {
  const p = (path.split("?")[0] ?? "").toLowerCase();
  return (
    p.endsWith("/healthz") ||
    p === "/api/auth/csrf" ||
    p === "/api/auth/csrf/" ||
    p === "/api/auth/refresh" ||
    p === "/api/auth/refresh/"
  );
};

const syncApiBusyDom = (): void => {
  if (typeof document === "undefined") return;
  const busy = apiInFlight > 0;
  if (busy) {
    if (!showTimer) {
      showTimer = setTimeout(() => {
        showTimer = null;
        if (apiInFlight > 0) document.documentElement.classList.add(API_BUSY_CLASS);
      }, BUSY_SHOW_DELAY_MS);
    }
  } else {
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
    document.documentElement.classList.remove(API_BUSY_CLASS);
  }
};

/** Pro ausstehendem apiFetch (außer Health/CSRF/Refresh). */
export const bumpApiInFlightForPath = (path: string, delta: number): void => {
  if (shouldSkipPath(path)) return;
  apiInFlight += delta;
  if (apiInFlight < 0) apiInFlight = 0;
  syncApiBusyDom();
};

export const HYDRATION_BUSY_CLASS = "app-initial-hydration";
export const NAV_LOCKED_BUSY_CLASS = "app-nav-locked-busy";
