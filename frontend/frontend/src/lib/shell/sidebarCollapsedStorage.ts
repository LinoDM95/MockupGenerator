/** localStorage-Schlüssel: Desktop-Sidebar eingeklappt (schmale Spalte + Lasche). */
export const SIDEBAR_COLLAPSED_STORAGE_KEY = "printflow-sidebar-collapsed";

export const readInitialSidebarCollapsedDesktop = (): boolean => {
  try {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export const persistSidebarCollapsedDesktop = (collapsed: boolean): void => {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // Quota / privates Fenster — ignorieren
  }
};
