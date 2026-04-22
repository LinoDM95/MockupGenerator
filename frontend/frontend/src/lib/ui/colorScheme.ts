/** LocalStorage-Schlüssel — mit index.html Hydration-Skript synchron halten. */
export const COLOR_SCHEME_STORAGE_KEY = "pf-color-scheme";

/** Früherer Schlüssel (Creative Engine); nur noch für einmaliges Auslesen/Migration. */
const LEGACY_COLOR_SCHEME_STORAGE_KEY = "ce-color-scheme";

export type ColorSchemeMode = "light" | "dark" | "system";

export const getStoredColorSchemeMode = (): ColorSchemeMode => {
  if (typeof window === "undefined") return "system";
  try {
    const raw =
      localStorage.getItem(COLOR_SCHEME_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_COLOR_SCHEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return "system";
};

export const setStoredColorSchemeMode = (mode: ColorSchemeMode): void => {
  try {
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, mode);
    try {
      localStorage.removeItem(LEGACY_COLOR_SCHEME_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
};

export const resolveIsDark = (mode: ColorSchemeMode): boolean => {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

export const applyColorSchemeToDocument = (mode: ColorSchemeMode): void => {
  const dark = resolveIsDark(mode);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
};
