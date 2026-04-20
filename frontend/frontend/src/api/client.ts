import { bumpApiInFlightForPath } from "../lib/globalBusyCursor";
import { useAppStore } from "../store/appStore";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const buildUrl = (path: string): string => {
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
};

const readCookie = (name: string): string | null => {
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : null;
};

/** Einmalig beim App-Start: csrftoken-Cookie setzen. */
export const bootstrapCsrf = async (): Promise<void> => {
  await fetch(buildUrl("/api/auth/csrf/"), {
    credentials: "include",
  });
};

const isUnsafeMethod = (method?: string): boolean =>
  ["POST", "PUT", "PATCH", "DELETE"].includes((method ?? "GET").toUpperCase());

let refreshInFlight: Promise<boolean> | null = null;

export const refreshAccessToken = async (): Promise<boolean> => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const csrf = readCookie("csrftoken") ?? "";
        const res = await fetch(buildUrl("/api/auth/refresh/"), {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrf,
          },
          body: "{}",
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
};

/** Vor langen Operationen: Refresh (Access-Expiry ist im HttpOnly-Cookie nicht lesbar). */
export const refreshAccessTokenIfExpiringSoon = async (): Promise<void> => {
  await refreshAccessToken();
};

/** Kompatibilität: proaktiver Timer entfällt bei Cookie-JWT. */
export const clearProactiveTokenRefresh = (): void => {};

export const scheduleProactiveAccessRefresh = (): void => {};

const shouldTryRefreshOn401 = (path: string): boolean => {
  const base = path.split("?")[0] ?? path;
  if (base.startsWith("/api/auth/")) return false;
  return true;
};

const apiFetchOnce = async (path: string, init: RequestInit): Promise<Response> => {
  const url = buildUrl(path);
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const method = init.method ?? "GET";
  if (isUnsafeMethod(method)) {
    const csrf = readCookie("csrftoken");
    if (csrf) headers.set("X-CSRFToken", csrf);
  }
  return fetch(url, { ...init, headers, credentials: "include" });
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
      if (Array.isArray(j.detail)) return j.detail.map(String).join(", ");
      const fieldMsgs: string[] = [];
      for (const v of Object.values(j)) {
        if (Array.isArray(v)) fieldMsgs.push(...v.map(String));
        else if (typeof v === "string") fieldMsgs.push(v);
      }
      if (fieldMsgs.length) return fieldMsgs.join(" ");
    } catch {
      /* body is not JSON */
    }
    return this.message;
  }
}

export const apiFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  bumpApiInFlightForPath(path, 1);
  try {
    const res = await apiFetchOnce(path, init);
    if (res.status !== 401 || !shouldTryRefreshOn401(path)) return res;

    const refreshed = await refreshAccessToken();
    if (refreshed) return await apiFetchOnce(path, init);

    useAppStore.getState().logoutLocal();
    return res;
  } finally {
    bumpApiInFlightForPath(path, -1);
  }
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
