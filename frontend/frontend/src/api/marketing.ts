import { apiFetch, apiJson } from "./client";

export type PinterestBoard = {
  id: string;
  name: string;
};

export type PinterestBoardsResponse = {
  boards: PinterestBoard[];
};

export const getPinterestBoards = () =>
  apiJson<PinterestBoardsResponse>("/api/marketing/boards/");

export type PublishSingleSocialPostPayload = {
  image_url: string;
  title: string;
  caption: string;
  destination_url: string;
  platform: "pinterest";
  board_id: string;
};

export type PublishSingleSocialPostResponse = {
  id: string;
  pin_id: string;
  status: "posted";
};

export const publishSingleSocialPost = (body: PublishSingleSocialPostPayload) =>
  apiJson<PublishSingleSocialPostResponse>("/api/marketing/publish-single/", {
    method: "POST",
    body: JSON.stringify(body),
  });

export type MarketingOAuthStartResponse = {
  authorization_url: string;
  state?: string;
};

export const marketingOAuthStart = () =>
  apiJson<MarketingOAuthStartResponse>("/api/marketing/oauth/start/", {
    method: "GET",
  });

export const marketingOAuthCallback = (body: { code: string; state: string }) =>
  apiJson<{ ok?: boolean; expires_at?: string; detail?: string }>(
    "/api/marketing/oauth/callback/",
    { method: "POST", body: JSON.stringify(body) },
  );

export const marketingOAuthDisconnect = async () => {
  await apiFetch("/api/marketing/oauth/disconnect/", { method: "DELETE" });
};

export type MarketingConnectionStatus = {
  connected: boolean;
  expires_at?: string | null;
};

export const marketingConnectionStatus = () =>
  apiJson<MarketingConnectionStatus>("/api/marketing/status/");
