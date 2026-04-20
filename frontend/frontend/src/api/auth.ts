import { apiJson } from "./client";

export type CurrentUser = {
  id: number;
  username: string;
  email: string;
  date_joined: string | null;
  last_login: string | null;
};

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

export const fetchCurrentUser = async (): Promise<CurrentUser> =>
  apiJson<CurrentUser>("/api/auth/me/");

export const patchCurrentUser = async (payload: {
  username?: string;
  email?: string;
}): Promise<CurrentUser> =>
  apiJson<CurrentUser>("/api/auth/me/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

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
