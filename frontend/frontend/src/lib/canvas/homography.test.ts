import { describe, expect, it } from "vitest";

import { homographyUv01ToTemplate, invertMat3RowMajor, multiplyMat3Vec3 } from "./homography";

describe("homographyUv01ToTemplate", () => {
  it("maps unit square to axis-aligned rectangle", () => {
    const H = homographyUv01ToTemplate([
      { x: 10, y: 20 },
      { x: 110, y: 20 },
      { x: 110, y: 220 },
      { x: 10, y: 220 },
    ]);
    const inv = invertMat3RowMajor(H);
    expect(inv).not.toBeNull();
    const mid = multiplyMat3Vec3(inv!, 60, 120, 1);
    const u = mid[0] / mid[2];
    const v = mid[1] / mid[2];
    expect(u).toBeCloseTo(0.5, 2);
    expect(v).toBeCloseTo(0.5, 2);
  });

  it("maps trapezoid corner UVs", () => {
    const dst: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }] =
      [
        { x: 50, y: 30 },
        { x: 250, y: 40 },
        { x: 240, y: 180 },
        { x: 40, y: 170 },
      ];
    const H = homographyUv01ToTemplate(dst);
    const inv = invertMat3RowMajor(H)!;
    for (let i = 0; i < 4; i++) {
      const u = i === 0 || i === 3 ? 0 : 1;
      const v = i < 2 ? 0 : 1;
      const p = multiplyMat3Vec3(H, u, v, 1);
      const x = p[0] / p[2];
      const y = p[1] / p[2];
      expect(x).toBeCloseTo(dst[i].x, 1);
      expect(y).toBeCloseTo(dst[i].y, 1);
    }
    const back = multiplyMat3Vec3(inv, dst[1].x, dst[1].y, 1);
    expect(back[0] / back[2]).toBeCloseTo(1, 2);
    expect(back[1] / back[2]).toBeCloseTo(0, 2);
  });
});
