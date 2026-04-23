import { describe, expect, it } from "vitest";

import {
  integrationsModeFromUrlSegment,
  integrationsUrlSegmentFromMode,
  publishTabFromUrlSegment,
  workspaceTabFromUrlSegment,
  workspaceUrlSegmentFromTab,
} from "./appNavigation";

describe("appNavigation", () => {
  it("maps workspace URL segments to store tabs and back", () => {
    expect(workspaceTabFromUrlSegment("generator")).toBe("generator");
    expect(workspaceTabFromUrlSegment("vorlagen")).toBe("templates");
    expect(workspaceTabFromUrlSegment("upscaler")).toBe("upscaler");
    expect(workspaceTabFromUrlSegment("nope")).toBeNull();

    expect(workspaceUrlSegmentFromTab("generator")).toBe("generator");
    expect(workspaceUrlSegmentFromTab("templates")).toBe("vorlagen");
    expect(workspaceUrlSegmentFromTab("upscaler")).toBe("upscaler");
  });

  it("maps publish URL segments", () => {
    expect(publishTabFromUrlSegment("etsy")).toBe("etsy");
    expect(publishTabFromUrlSegment("marketing")).toBe("marketing");
    expect(publishTabFromUrlSegment("automation")).toBe("automation");
    expect(publishTabFromUrlSegment("x")).toBeNull();
  });

  it("maps integrations URL mode", () => {
    expect(integrationsModeFromUrlSegment(undefined)).toBe("wizard");
    expect(integrationsModeFromUrlSegment("assistent")).toBe("wizard");
    expect(integrationsModeFromUrlSegment("alle")).toBe("all");
    expect(integrationsUrlSegmentFromMode("wizard")).toBe("assistent");
    expect(integrationsUrlSegmentFromMode("all")).toBe("alle");
  });
});
