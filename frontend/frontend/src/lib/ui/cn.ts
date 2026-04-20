export type ClassValue = string | number | boolean | null | undefined;

/** Minimale Klassen-Zusammenführung (ohne extra dependency). */
export const cn = (...parts: ClassValue[]): string =>
  parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
