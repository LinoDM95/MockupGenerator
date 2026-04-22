import { describe, expect, it } from "vitest";

import { resolveCompanionTargetAddressSpace } from "./companionConstants";

describe("resolveCompanionTargetAddressSpace", () => {
  it("returns undefined for non-HTTPS page", () => {
    expect(
      resolveCompanionTargetAddressSpace("http://localhost:8001", "http:"),
    ).toBeUndefined();
  });

  it("returns undefined for relative companion URL (dev proxy)", () => {
    expect(resolveCompanionTargetAddressSpace("/__companion", "https:")).toBeUndefined();
  });

  it("uses local for loopback HTTP companion from HTTPS", () => {
    expect(
      resolveCompanionTargetAddressSpace("http://localhost:8001", "https:"),
    ).toBe("local");
    expect(
      resolveCompanionTargetAddressSpace("http://127.0.0.2:8001", "https:"),
    ).toBe("local");
  });

  it("uses private for RFC1918 HTTP companion from HTTPS", () => {
    expect(
      resolveCompanionTargetAddressSpace("http://192.168.1.10:8001", "https:"),
    ).toBe("private");
  });

  it("returns undefined when companion is HTTPS", () => {
    expect(
      resolveCompanionTargetAddressSpace("https://localhost:8001", "https:"),
    ).toBeUndefined();
  });
});
