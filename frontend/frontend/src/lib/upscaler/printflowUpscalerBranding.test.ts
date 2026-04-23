import { describe, expect, it } from "vitest";

import {
  batchScopeLabel,
  displayEngineLabel,
  modelRowLabel,
  queueSubtitleForEngine,
  UPSCALER_UI_PRODUCT_NAME,
} from "./printflowUpscalerBranding";

describe("printflowUpscalerBranding", () => {
  it("Bereichsname in der UI ist Upscaler", () => {
    expect(UPSCALER_UI_PRODUCT_NAME).toBe("Upscaler");
  });

  it("blendet Replicate aus Kundenlabels aus (hosted cloud)", () => {
    expect(displayEngineLabel("replicate")).toBe("PrintFlow Cloud");
    expect(batchScopeLabel("replicate")).toBe("PrintFlow Cloud");
    expect(queueSubtitleForEngine("replicate", "3 Jobs")).toContain("PrintFlow Cloud");
    expect(modelRowLabel("replicate")).toContain("PrintFlow Cloud");
    expect(modelRowLabel("replicate")).not.toMatch(/replicate/i);
  });
});
