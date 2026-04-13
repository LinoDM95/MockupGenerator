import { apiJson } from "./client";

type TokenResponse = { access: string; refresh: string };

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
