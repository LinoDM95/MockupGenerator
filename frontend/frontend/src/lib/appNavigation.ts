import type { NavigateFunction } from "react-router-dom";

import type { PublishTab, WorkspaceTab } from "../store/appStore";

export const ACCOUNT_PATH = "/app/konto";
export const FEEDBACK_PATH = "/app/feedback";

let routerNavigate: NavigateFunction | null = null;

export const registerAppNavigate = (fn: NavigateFunction | null): void => {
  routerNavigate = fn;
};

export const appNavigateTo = (to: string, opts?: { replace?: boolean }): void => {
  routerNavigate?.(to, { replace: opts?.replace ?? false });
};

export type WorkspaceUrlSegment = "generator" | "vorlagen" | "upscaler";

export const workspaceTabFromUrlSegment = (segment: string): WorkspaceTab | null => {
  if (segment === "generator") return "generator";
  if (segment === "vorlagen") return "templates";
  if (segment === "upscaler") return "upscaler";
  return null;
};

export const workspaceUrlSegmentFromTab = (tab: WorkspaceTab): WorkspaceUrlSegment => {
  if (tab === "generator") return "generator";
  if (tab === "templates") return "vorlagen";
  return "upscaler";
};

export const publishTabFromUrlSegment = (segment: string): PublishTab | null => {
  if (segment === "etsy") return "etsy";
  if (segment === "marketing") return "marketing";
  if (segment === "automation") return "automation";
  return null;
};

