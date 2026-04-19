import { apiJson } from "./client";

type TokenResponse = { access: string; refresh: string };

export type CurrentUser = {
  id: number;
  username: string;
  email: string;
};

export const login = async (username: string, password: string): Promise<TokenResponse> =>
  apiJson<TokenResponse>("/api/auth/token/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

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

export const patchCurrentUser = async (payload: { username: string }): Promise<CurrentUser> =>
  apiJson<CurrentUser>("/api/auth/me/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const changePassword = async (payload: {
  current_password: string;
  new_password: string;
}): Promise<void> => {
  await apiJson<undefined>("/api/auth/change-password/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};
