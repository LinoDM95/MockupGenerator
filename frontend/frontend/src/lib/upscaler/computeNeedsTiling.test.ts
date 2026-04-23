import { describe, expect, it } from "vitest";

import { computeNeedsTiling } from "./computeNeedsTiling";

describe("computeNeedsTiling", () => {
  it("ist false ohne Abmessungen", () => {
    expect(computeNeedsTiling({}, 4)).toBe(false);
  });

  it("ist false wenn Ausgabe unter dem Pixel-Limit bleibt", () => {
    expect(computeNeedsTiling({ originalWidth: 1000, originalHeight: 1000 }, 4)).toBe(
      false,
    );
  });

  it("ist true wenn skalierte Fläche das Limit übersteigt", () => {
    expect(computeNeedsTiling({ originalWidth: 5000, originalHeight: 5000 }, 4)).toBe(
      true,
    );
  });
});
