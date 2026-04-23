import type { ArtworkItem } from "../../types/mockup";

export const filterArtworksByQuery = (
  artworks: ArtworkItem[],
  query: string,
): ArtworkItem[] => {
  const q = query.trim().toLowerCase();
  if (!q) return artworks;
  return artworks.filter((a) => a.name.toLowerCase().includes(q));
};
