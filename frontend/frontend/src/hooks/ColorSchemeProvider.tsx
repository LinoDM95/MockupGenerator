import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";

import {
  applyColorSchemeToDocument,
  COLOR_SCHEME_STORAGE_KEY,
  getStoredColorSchemeMode,
  resolveIsDark,
  setStoredColorSchemeMode,
  type ColorSchemeMode,
} from "../lib/ui/colorScheme";

type ColorSchemeContextValue = {
  mode: ColorSchemeMode;
  isDark: boolean;
  setMode: (next: ColorSchemeMode) => void;
  toggleLightDark: () => void;
};

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

export const ColorSchemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<ColorSchemeMode>(() => getStoredColorSchemeMode());
  const [, bump] = useReducer((n: number) => n + 1, 0);

  const isDark = resolveIsDark(mode);

  useEffect(() => {
    applyColorSchemeToDocument(mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyColorSchemeToDocument("system");
      bump();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== COLOR_SCHEME_STORAGE_KEY && e.key != null) return;
      const next = getStoredColorSchemeMode();
      setModeState(next);
      applyColorSchemeToDocument(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setMode = useCallback((next: ColorSchemeMode) => {
    setStoredColorSchemeMode(next);
    setModeState(next);
  }, []);

  const toggleLightDark = useCallback(() => {
    setMode(isDark ? "light" : "dark");
  }, [isDark, setMode]);

  const value = useMemo<ColorSchemeContextValue>(
    () => ({ mode, isDark, setMode, toggleLightDark }),
    [mode, isDark, setMode, toggleLightDark],
  );

  return <ColorSchemeContext.Provider value={value}>{children}</ColorSchemeContext.Provider>;
};

export const useColorScheme = (): ColorSchemeContextValue => {
  const ctx = useContext(ColorSchemeContext);
  if (!ctx) {
    throw new Error("useColorScheme muss innerhalb von ColorSchemeProvider verwendet werden.");
  }
  return ctx;
};
