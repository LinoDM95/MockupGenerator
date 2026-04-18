/**
 * Local FastAPI Companion (Standard: Port 8001, Django bleibt auf 8000).
 *
 * - Dev (Vite): Requests gehen über `/__companion` → Proxy gleicher Origin, kein CORS-Problem.
 * - Produktion: Direkt `http://localhost:8001` (Companion muss CORS für deine App-Origin erlauben).
 *
 * Override: `VITE_COMPANION_URL` z. B. `http://127.0.0.1:8001`
 */
const envUrl = import.meta.env.VITE_COMPANION_URL?.trim();

export const COMPANION_BASE_URL =
  envUrl ||
  (import.meta.env.DEV ? "/__companion" : "http://localhost:8001");
