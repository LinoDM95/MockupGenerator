import { apiJson } from "./client";

export type CurrentUser = {
  id: number;
  username: string;
  email: string;
  date_joined: string | null;
  last_login: string | null;
  is_staff: boolean;
  is_superuser: boolean;
};

const ME_TTL_MS = 15_000;

let meClientCache: { at: number; data: CurrentUser } | null = null;
let meInFlight: Promise<CurrentUser> | null = null;
let meFetchGen = 0;

/** Nur für Vitest. */
export const __resetCurrentUserClientStateForTests = (): void => {
  meClientCache = null;
  meInFlight = null;
  meFetchGen = 0;
};

export const invalidateCurrentUserClientCache = (): void => {
  meClientCache = null;
  meFetchGen += 1;
};

const runMeFetch = (gen: number): Promise<CurrentUser> =>
  apiJson<CurrentUser>("/api/auth/me/").then((data) => {
    if (gen === meFetchGen) {
      meClientCache = { at: Date.now(), data };
    }
    return data;
  });

export type AccountDataExport = {
  export_version: number;
  exported_at: string;
  user: {
    username: string;
    email: string;
    date_joined: string | null;
    last_login: string | null;
  };
  template_sets: Array<{
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    templates: Array<{
      id: string;
      name: string;
      width: number;
      height: number;
      order: number;
    }>;
  }>;
};

export const login = async (username: string, password: string): Promise<void> => {
  invalidateCurrentUserClientCache();
  await apiJson<{ detail?: string }>("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
};

export const apiLogout = async (): Promise<void> => {
  await apiJson<{ detail?: string }>("/api/auth/logout/", {
    method: "POST",
    body: "{}",
  });
  invalidateCurrentUserClientCache();
};

export const register = async (payload: {
  username: string;
  password: string;
  email?: string;
}): Promise<void> => {
  await apiJson("/api/auth/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

/**
 * GET /api/auth/me/ — kurze Client-TTL; nach Logout `invalidateCurrentUserClientCache`.
 */
export const fetchCurrentUser = (opts?: { force?: boolean }): Promise<CurrentUser> => {
  const force = opts?.force === true;
  if (force) {
    invalidateCurrentUserClientCache();
  }
  if (!force && meClientCache && Date.now() - meClientCache.at < ME_TTL_MS) {
    return Promise.resolve(meClientCache.data);
  }
  if (!force && meInFlight) {
    return meInFlight;
  }
  const gen = meFetchGen;
  const p = runMeFetch(gen).finally(() => {
    if (meInFlight === p) {
      meInFlight = null;
    }
  });
  meInFlight = p;
  return p;
};

export const patchCurrentUser = async (payload: {
  username?: string;
  email?: string;
}): Promise<CurrentUser> => {
  const data = await apiJson<CurrentUser>("/api/auth/me/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  meClientCache = { at: Date.now(), data };
  return data;
};

export const fetchAccountDataExport = (): Promise<AccountDataExport> =>
  apiJson<AccountDataExport>("/api/auth/me/export/");

export const deleteAccount = async (payload: {
  password: string;
  confirm_username: string;
}): Promise<void> => {
  await apiJson<undefined>("/api/auth/delete-account/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  invalidateCurrentUserClientCache();
};

export const changePassword = async (payload: {
  current_password: string;
  new_password: string;
}): Promise<void> => {
  await apiJson<undefined>("/api/auth/change-password/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};
