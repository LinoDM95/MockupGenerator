import {
  ACCOUNT_PATH,
  FEEDBACK_PATH,
  publishTabFromUrlSegment,
  workspaceTabFromUrlSegment,
} from "./appNavigation";
import { useAppStore } from "../store/appStore";

/** Zustand an React-Router anbinden (Browser-Zurück/Vor, direkte URLs). */
export const syncAppStoreWithPathname = (pathname: string): void => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0 || parts[0] !== "app") return;

  if (pathname === ACCOUNT_PATH || pathname === FEEDBACK_PATH) {
    return;
  }

  const s1 = parts[1];
  const s2 = parts[2];

  const set = useAppStore.setState;

  if (s1 === "erstellen" && s2) {
    const wt = workspaceTabFromUrlSegment(s2);
    if (wt) {
      set({ activeTab: "workspace", workspaceTab: wt, publishTab: null });
    }
    return;
  }

  if (s1 === "publizieren" && s2) {
    const pt = publishTabFromUrlSegment(s2);
    if (pt) {
      set({ activeTab: "publish", publishTab: pt });
    }
    return;
  }

  if (s1 === "integrationen") {
    set({
      activeTab: "integrations",
      publishTab: null,
    });
  }
};
