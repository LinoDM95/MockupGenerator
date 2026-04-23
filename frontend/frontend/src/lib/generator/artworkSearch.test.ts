import { describe, expect, it } from "vitest";

import type { ArtworkItem } from "../../types/mockup";
import { filterArtworksByQuery } from "./artworkSearch";

const mockArt = (overrides: Partial<ArtworkItem>): ArtworkItem => ({
  id: "1",
  file: new File([], "x.png"),
  url: "blob:x",
  name: "unnamed",
  setId: "set",
  ...overrides,
});

describe("filterArtworksByQuery", () => {
  it("gibt alle Motive zurück, wenn die Suche leer ist", () => {
    const a = [
      mockArt({ id: "a", name: "Foo" }),
      mockArt({ id: "b", name: "Bar" }),
    ];
    expect(filterArtworksByQuery(a, "")).toEqual(a);
    expect(filterArtworksByQuery(a, "   ")).toEqual(a);
  });

  it("filtert case-insensitive nach Namen", () => {
    const a = [
      mockArt({ id: "1", name: "Sommer-Design.png" }),
      mockArt({ id: "2", name: "Winter.png" }),
    ];
    expect(filterArtworksByQuery(a, "sommer")).toEqual([a[0]]);
    expect(filterArtworksByQuery(a, "PNG")).toEqual(a);
  });
});
