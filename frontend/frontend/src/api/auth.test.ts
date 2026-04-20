import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiJson } from "./client";

vi.mock("./client", () => ({
  apiJson: vi.fn(),
}));

const mockedApiJson = vi.mocked(apiJson);

describe("auth API helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedApiJson.mockReset();
  });

  it("deleteAccount POSTs password and confirm_username", async () => {
    mockedApiJson.mockResolvedValue(undefined);
    const { deleteAccount } = await import("./auth");
    await deleteAccount({ password: "secret", confirm_username: "me" });
    expect(mockedApiJson).toHaveBeenCalledWith("/api/auth/delete-account/", {
      method: "POST",
      body: JSON.stringify({ password: "secret", confirm_username: "me" }),
    });
  });

  it("patchCurrentUser sends partial fields", async () => {
    mockedApiJson.mockResolvedValue({
      id: 1,
      username: "u",
      email: "a@b.de",
      date_joined: null,
      last_login: null,
    });
    const { patchCurrentUser } = await import("./auth");
    await patchCurrentUser({ email: "a@b.de" });
    expect(mockedApiJson).toHaveBeenCalledWith("/api/auth/me/", {
      method: "PATCH",
      body: JSON.stringify({ email: "a@b.de" }),
    });
  });

  it("fetchAccountDataExport GETs export endpoint", async () => {
    mockedApiJson.mockResolvedValue({
      export_version: 1,
      exported_at: "x",
      user: { username: "u", email: "", date_joined: null, last_login: null },
      template_sets: [],
    });
    const { fetchAccountDataExport } = await import("./auth");
    const data = await fetchAccountDataExport();
    expect(data.export_version).toBe(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/api/auth/me/export/");
  });
});
