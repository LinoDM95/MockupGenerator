import { describe, expect, it } from "vitest";

import { resolveWarpParams } from "./webglWarp";

describe("resolveWarpParams", () => {
  it("merges defaults for fold fields", () => {
    const p = resolveWarpParams({ foldStrength: 0.8 });
    expect(p.foldStrength).toBe(0.8);
    expect(p.foldShadowDepth).toBe(0.28);
    expect(p.foldSmoothing).toBe(6);
    expect(p.sobelRadius).toBe(1);
    expect(p.artworkSaturation).toBe(1);
    expect(p.analysisDenoise).toBe(0.42);
    expect(p.foldNoiseFloor).toBe(0.012);
  });
});
