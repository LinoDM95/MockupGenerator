import { describe, expect, it } from "vitest";

import { maxReplicateParallelWorkers, REPLICATE_TILING_MAX_PARALLEL } from "./replicateTileParallel";

describe("maxReplicateParallelWorkers", () => {
  it("returns at most 8 and at least 1", () => {
    expect(
      maxReplicateParallelWorkers(10_000, 10_000, 4),
    ).toBeLessThanOrEqual(REPLICATE_TILING_MAX_PARALLEL);
    expect(maxReplicateParallelWorkers(4, 4, 4)).toBe(1);
  });
});
