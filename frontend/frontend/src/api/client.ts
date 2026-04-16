import { useAppStore } from "../store/appStore";

const getToken = () => localStorage.getItem("access_token");

/** Access-Token ~5 Min vor Ablauf erneuern (lange Sessions / Batch-Jobs). */
const PROACTIVE_BUFFER_MS = 5 * 60 * 1000;
const PROACTIVE_MIN_DELAY_MS = 5_000;

let proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null;

const parseJwtExpMs = (token: string): number | null => {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(b64 + pad)) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

/** Timer abbrechen (z. B. bei Logout). */
export const clearProactiveTokenRefresh = (): void => {
  if (proactiveRefreshTimer !== null) {
    clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }
};

/**
 * Plant ein Access-Token-Refresh kurz vor Ablauf. Nach erfolgreichem Login oder
 * manuellem Refresh erneut aufrufen (z. B. aus App.tsx bei accessToken-Änderung).
 */
export const scheduleProactiveAccessRefresh = (): void => {
  clearProactiveTokenRefresh();
  const token = localStorage.getItem("access_token");
  if (!token) return;
  const expMs = parseJwtExpMs(token);
  if (!expMs) return;
  const dueIn = expMs - PROACTIVE_BUFFER_MS - Date.now();
  const delayMs = dueIn <= 0 ? PROACTIVE_MIN_DELAY_MS : dueIn;

  proactiveRefreshTimer = setTimeout(() => {
    proactiveRefreshTimer = null;
    void (async () => {
      const ok = await refreshAccessToken();
      if (ok) {
        scheduleProactiveAccessRefresh();
      }
    })();
  }, delayMs);
};

/** Vor langen Operationen: Token erneuern, wenn es in wenigen Minuten abläuft. */
export const refreshAccessTokenIfExpiringSoon = async (): Promise<void> => {
  const token = localStorage.getItem("access_token");
  if (!token) return;
  const expMs = parseJwtExpMs(token);
  if (!expMs) return;
  if (expMs - Date.now() >= PROACTIVE_BUFFER_MS) return;
  const ok = await refreshAccessToken();
  if (ok) {
    scheduleProactiveAccessRefresh();
  }
};

/** Kein Refresh bei Login/Register/Refresh-Endpoint (Endlosschleifen vermeiden). */
const shouldTryRefreshOn401 = (path: string): boolean => {
  const base = path.split("?")[0] ?? path;
  if (base.startsWith("/api/auth/token/refresh")) return false;
  if (base === "/api/auth/token" || base === "/api/auth/token/") return false;
  if (base.startsWith("/api/auth/register")) return false;
  return true;
};

let refreshInFlight: Promise<boolean> | null = null;

const refreshAccessToken = async (): Promise<boolean> => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const refresh = localStorage.getItem("refresh_token");
        if (!refresh) return false;
        const res = await fetch("/api/auth/token/refresh/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { access?: string; refresh?: string };
        if (!data.access) return false;
        useAppStore.getState().setTokens(data.access, data.refresh ?? refresh);
        scheduleProactiveAccessRefresh();
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
};

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.status = status;
    this.body = body;
  }

  getDetail(): string {
    try {
      const j = JSON.parse(this.body) as Record<string, unknown>;
      if (typeof j.detail === "string") return j.detail;
      if (Array.isArray(j.detail)) return j.detail.join(", ");
    } catch {
      /* body is not JSON */
    }
    return this.message;
  }
}

const apiFetchOnce = async (path: string, init: RequestInit): Promise<Response> => {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(path, { ...init, headers });
};

export const apiFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const res = await apiFetchOnce(path, init);
  if (res.status !== 401 || !shouldTryRefreshOn401(path)) return res;

  const refreshed = await refreshAccessToken();
  if (refreshed) return apiFetchOnce(path, init);

  useAppStore.getState().logout();
  return res;
};

export const apiJson = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const res = await apiFetch(path, init);
  const text = await res.text();
  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status}`, res.status, text);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
};
