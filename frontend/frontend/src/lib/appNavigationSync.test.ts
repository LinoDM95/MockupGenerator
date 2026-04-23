import { afterEach, describe, expect, it, vi } from "vitest";

import { useAppStore } from "../store/appStore";
import { syncAppStoreWithPathname } from "./appNavigationSync";

describe("syncAppStoreWithPathname", () => {
  afterEach(() => {
    useAppStore.setState({
      activeTab: "workspace",
      workspaceTab: "generator",
      publishTab: null,
    });
  });

  it("syncs Erstellen URL to workspace tab", () => {
    syncAppStoreWithPathname("/app/erstellen/vorlagen");
    expect(useAppStore.getState().activeTab).toBe("workspace");
    expect(useAppStore.getState().workspaceTab).toBe("templates");
    expect(useAppStore.getState().publishTab).toBeNull();
  });

  it("syncs Publizieren URL", () => {
    syncAppStoreWithPathname("/app/publizieren/marketing");
    expect(useAppStore.getState().activeTab).toBe("publish");
    expect(useAppStore.getState().publishTab).toBe("marketing");
  });

  it("syncs Integrationen /alle", () => {
    syncAppStoreWithPathname("/app/integrationen/alle");
    expect(useAppStore.getState().activeTab).toBe("integrations");
  });

  it("ignores Konto path", () => {
    useAppStore.setState({ activeTab: "integrations" });
    syncAppStoreWithPathname("/app/konto");
    expect(useAppStore.getState().activeTab).toBe("integrations");
  });
});

describe("goToWorkspace navigates when router registered", () => {
  it("calls appNavigateTo via store", async () => {
    const nav = vi.fn();
    const { registerAppNavigate } = await import("./appNavigation");
    registerAppNavigate(nav as unknown as import("react-router-dom").NavigateFunction);

    useAppStore.getState().goToWorkspace("templates");
    expect(nav).toHaveBeenCalledWith("/app/erstellen/vorlagen", { replace: false });

    registerAppNavigate(null);
  });
});
