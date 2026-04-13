import { useAppStore } from "../store/appStore";

const getToken = () => localStorage.getItem("access_token");

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
