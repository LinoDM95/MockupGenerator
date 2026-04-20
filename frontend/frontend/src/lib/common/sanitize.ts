export const sanitizeFileName = (name: string): string =>
  name.replace(/[^a-zA-Z0-9_-]/g, "_");
