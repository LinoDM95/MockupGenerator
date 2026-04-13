import { create } from "zustand";

import type { ArtworkItem, Template, TemplateSet } from "../types/mockup";
import type { FrameStyle } from "../types/mockup";

export type AppTab = "generator" | "templates" | "etsy";

interface DialogState {
  isOpen: boolean;
  type: "prompt" | "confirm";
  title: string;
  message: string;
  inputValue: string;
  resolve: ((v: string | null) => void) | null;
  resolveBool: ((v: boolean) => void) | null;
}

interface AppState {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (access: string | null, refresh?: string | null) => void;
  logout: () => void;

  activeTab: AppTab;
  setActiveTab: (t: AppTab) => void;

  templateSets: TemplateSet[];
  setTemplateSets: (sets: TemplateSet[]) => void;
  patchTemplateSet: (id: string, patch: Partial<TemplateSet>) => void;

  editingSetId: string | null;
  setEditingSetId: (id: string | null) => void;

  editingTemplate: Template | null;
  setEditingTemplate: (t: Template | null) => void;
  updateEditingTemplate: (fn: (prev: Template | null) => Template | null) => void;

  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;

  artworks: ArtworkItem[];
  setArtworks: (a: ArtworkItem[] | ((prev: ArtworkItem[]) => ArtworkItem[])) => void;

  globalSetId: string;
  globalFrameStyle: FrameStyle;
  setGlobalSetId: (id: string) => void;
  setGlobalFrameStyle: (s: FrameStyle) => void;

  dialog: DialogState;
  openPrompt: (title: string, defaultValue?: string) => Promise<string | null>;
  openConfirm: (message: string) => Promise<boolean>;
  confirmDialog: () => void;
  cancelDialog: () => void;
  setDialogInput: (v: string) => void;
}

const emptyDialog = (): DialogState => ({
  isOpen: false,
  type: "prompt",
  title: "",
  message: "",
  inputValue: "",
  resolve: null,
  resolveBool: null,
});

export const useAppStore = create<AppState>((set, get) => ({
  accessToken: localStorage.getItem("access_token"),
  refreshToken: localStorage.getItem("refresh_token"),
  setTokens: (access, refresh) => {
    if (access) localStorage.setItem("access_token", access);
    else localStorage.removeItem("access_token");
    if (refresh !== undefined) {
      if (refresh) localStorage.setItem("refresh_token", refresh);
      else localStorage.removeItem("refresh_token");
    }
    set({
      accessToken: access,
      refreshToken: refresh ?? get().refreshToken,
    });
  },
  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ accessToken: null, refreshToken: null, templateSets: [] });
  },

  activeTab: "generator",
  setActiveTab: (t) => set({ activeTab: t }),

  templateSets: [],
  setTemplateSets: (sets) => set({ templateSets: sets }),
  patchTemplateSet: (id, patch) =>
    set((s) => ({
      templateSets: s.templateSets.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    })),

  editingSetId: null,
  setEditingSetId: (id) => set({ editingSetId: id }),

  editingTemplate: null,
  setEditingTemplate: (t) => set({ editingTemplate: t }),
  updateEditingTemplate: (fn) =>
    set((s) => ({ editingTemplate: fn(s.editingTemplate) })),

  selectedElementId: null,
  setSelectedElementId: (id) => set({ selectedElementId: id }),

  artworks: [],
  setArtworks: (a) =>
    set((s) => ({ artworks: typeof a === "function" ? a(s.artworks) : a })),

  globalSetId: "",
  globalFrameStyle: "none",
  setGlobalSetId: (id) => set({ globalSetId: id }),
  setGlobalFrameStyle: (style) => set({ globalFrameStyle: style }),

  dialog: emptyDialog(),
  openPrompt: (title, defaultValue = "") =>
    new Promise((resolve) => {
      set({
        dialog: {
          isOpen: true,
          type: "prompt",
          title,
          message: "",
          inputValue: defaultValue,
          resolve: resolve as (v: string | null) => void,
          resolveBool: null,
        },
      });
    }),
  openConfirm: (message) =>
    new Promise((resolve) => {
      set({
        dialog: {
          isOpen: true,
          type: "confirm",
          title: "Bitte bestätigen",
          message,
          inputValue: "",
          resolve: null,
          resolveBool: resolve as (v: boolean) => void,
        },
      });
    }),
  confirmDialog: () => {
    const d = get().dialog;
    if (d.type === "prompt") d.resolve?.(d.inputValue.trim() || null);
    else d.resolveBool?.(true);
    set({ dialog: emptyDialog() });
  },
  cancelDialog: () => {
    const d = get().dialog;
    if (d.type === "prompt") d.resolve?.(null);
    else d.resolveBool?.(false);
    set({ dialog: emptyDialog() });
  },
  setDialogInput: (v) =>
    set((s) => ({ dialog: { ...s.dialog, inputValue: v } })),
}));
