import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiJson } from "./client";

vi.mock("./client", () => ({
  apiJson: vi.fn(),
  apiFetch: vi.fn(),
}));

const mockedApiJson = vi.mocked(apiJson);

describe("fetchTemplateSets cache", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedApiJson.mockReset();
  });

  it("deduplicates parallel list requests", async () => {
    mockedApiJson.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    const {
      __resetTemplateSetsListClientStateForTests,
      fetchTemplateSets,
      invalidateTemplateSetsListCache,
    } = await import("./sets");
    __resetTemplateSetsListClientStateForTests();
    await Promise.all([fetchTemplateSets(), fetchTemplateSets()]);
    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/api/sets/?limit=200");
    invalidateTemplateSetsListCache();
    await fetchTemplateSets();
    expect(mockedApiJson).toHaveBeenCalledTimes(2);
  });
});
