import { useCallback, useEffect, useReducer, useState } from "react";

import {
  applyColorSchemeToDocument,
  getStoredColorSchemeMode,
  resolveIsDark,
  setStoredColorSchemeMode,
  type ColorSchemeMode,
} from "../lib/colorScheme";

export const useColorScheme = () => {
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

  const setMode = useCallback((next: ColorSchemeMode) => {
    setStoredColorSchemeMode(next);
    setModeState(next);
  }, []);

  /** Wechselt zwischen explizitem Hell und Dunkel (überschreibt `system`). */
  const toggleLightDark = useCallback(() => {
    setMode(isDark ? "light" : "dark");
  }, [isDark, setMode]);

  return { mode, isDark, setMode, toggleLightDark };
};
