import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { LoadingOverlay } from "./LoadingOverlay";

describe("LoadingOverlay", () => {
  let host: HTMLDivElement | null = null;
  let root: Root | null = null;

  const setup = () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  };

  afterEach(() => {
    root?.unmount();
    root = null;
    host?.remove();
    host = null;
  });

  it("blendet Inhalt mit Status und Nachricht ein, wenn show true", async () => {
    setup();
    root!.render(
      createElement(LoadingOverlay, {
        show: true,
        message: "Verarbeite …",
        fullScreen: false,
      }),
    );

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const status = host!.querySelector('[role="status"]');
    expect(status).toBeTruthy();
    expect(status?.getAttribute("aria-busy")).toBe("true");
    expect(host!.textContent).toContain("Verarbeite …");
  });

  it("zeigt keinen Status, wenn show false", () => {
    setup();
    root!.render(createElement(LoadingOverlay, { show: false }));

    expect(host!.querySelector('[role="status"]')).toBeNull();
  });
});
