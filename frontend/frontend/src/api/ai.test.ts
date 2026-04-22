import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiJson } from "./client";
import {
  __resetAiStatusClientStateForTests,
  fetchAiStatus,
  invalidateAiStatusClientCache,
} from "./ai";

vi.mock("./client", () => ({
  apiJson: vi.fn(),
}));

const defaultAi = {
  connected: true,
  vertex_upscaler_configured: false,
  replicate_upscale_configured: false,
  prefer_expert_mode: false,
} as const;

const mockedApiJson = vi.mocked(apiJson);

describe("fetchAiStatus", () => {
  beforeEach(() => {
    __resetAiStatusClientStateForTests();
    mockedApiJson.mockReset();
    mockedApiJson.mockResolvedValue({ ...defaultAi });
  });

  it("deduplicates parallel in-flight requests", async () => {
    const p1 = fetchAiStatus();
    const p2 = fetchAiStatus();
    await Promise.all([p1, p2]);
    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/api/ai/status/");
  });

  it("serves TTL cache without extra apiJson calls", async () => {
    const a = await fetchAiStatus();
    const b = await fetchAiStatus();
    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);
  });

  it("force:true bypasses cache", async () => {
    mockedApiJson
      .mockResolvedValueOnce({ ...defaultAi })
      .mockResolvedValueOnce({ ...defaultAi, connected: false });
    await fetchAiStatus();
    const second = await fetchAiStatus({ force: true });
    expect(second.connected).toBe(false);
    expect(mockedApiJson).toHaveBeenCalledTimes(2);
  });

  it("invalidate clears cache so the next fetch refetches", async () => {
    await fetchAiStatus();
    invalidateAiStatusClientCache();
    await fetchAiStatus();
    expect(mockedApiJson).toHaveBeenCalledTimes(2);
  });
});
