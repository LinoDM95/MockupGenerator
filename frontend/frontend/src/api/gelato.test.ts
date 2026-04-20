import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiJson } from "./client";
import {
  __resetGelatoClientStateForTests,
  fetchGelatoListTemplates,
  fetchGelatoStatus,
  invalidateGelatoClientCache,
} from "./gelato";

vi.mock("./client", () => ({
  apiJson: vi.fn(),
}));

const defaultStatus = {
  connected: true,
  store_id: "s1",
  store_name: "Shop",
} as const;

const defaultTemplates = [
  {
    id: 1,
    gelato_template_id: "t1",
    name: "T",
    preview_url: "",
    is_active: true,
    synced_at: "",
  },
];

const mockedApiJson = vi.mocked(apiJson);

describe("fetchGelatoStatus", () => {
  beforeEach(() => {
    __resetGelatoClientStateForTests();
    mockedApiJson.mockReset();
    mockedApiJson.mockResolvedValue({ ...defaultStatus });
  });

  it("deduplicates parallel in-flight requests", async () => {
    const p1 = fetchGelatoStatus();
    const p2 = fetchGelatoStatus();
    await Promise.all([p1, p2]);
    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/api/gelato/status/");
  });

  it("serves TTL cache without extra apiJson calls", async () => {
    const a = await fetchGelatoStatus();
    const b = await fetchGelatoStatus();
    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);
  });

  it("force:true bypasses cache", async () => {
    mockedApiJson
      .mockResolvedValueOnce({ ...defaultStatus })
      .mockResolvedValueOnce({ ...defaultStatus, connected: false });
    await fetchGelatoStatus();
    const second = await fetchGelatoStatus({ force: true });
    expect(second.connected).toBe(false);
    expect(mockedApiJson).toHaveBeenCalledTimes(2);
  });

  it("invalidate clears cache so the next fetch refetches", async () => {
    await fetchGelatoStatus();
    invalidateGelatoClientCache();
    await fetchGelatoStatus();
    expect(mockedApiJson).toHaveBeenCalledTimes(2);
  });
});

describe("fetchGelatoListTemplates", () => {
  beforeEach(() => {
    __resetGelatoClientStateForTests();
    mockedApiJson.mockReset();
  });

  it("uses templates cache and invalidates with gelato status gen", async () => {
    mockedApiJson.mockResolvedValueOnce({ ...defaultStatus }).mockResolvedValue(defaultTemplates);
    await fetchGelatoStatus();
    await fetchGelatoListTemplates();
    expect(mockedApiJson).toHaveBeenCalledTimes(2);

    const t1 = await fetchGelatoListTemplates();
    const t2 = await fetchGelatoListTemplates();
    expect(t1).toBe(t2);
    expect(mockedApiJson).toHaveBeenCalledTimes(2);

    invalidateGelatoClientCache();
    mockedApiJson.mockResolvedValueOnce({ ...defaultStatus }).mockResolvedValueOnce(defaultTemplates);
    await fetchGelatoStatus();
    await fetchGelatoListTemplates();
    expect(mockedApiJson).toHaveBeenCalledTimes(4);
  });
});
