import { create } from "zustand";

import type { ArtworkItem, Template, TemplateSet } from "../types/mockup";

/** Hauptnavigation (Header): weniger Einträge, mehr Struktur. */
export type AppTab = "workspace" | "integrations" | "automation" | "marketing";

/** Unter-Tabs im Bereich „Erstellen“. */
export type WorkspaceTab = "generator" | "templates" | "upscaler" | "etsy";

/** Zielbereich im zentralen Integrations-Setup (Setup Hub). */
export type IntegrationHubSection =
  | "etsy"
  | "gelato"
  | "gemini"
  | "cloudflare_r2"
  | "pinterest";

/** Unteransicht auf der Seite „Integrationen“. */
export type IntegrationsPanelMode = "wizard" | "all";

export type IntegrationWizardStepId = 1 | 2 | 3;

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

  workspaceTab: WorkspaceTab;
  setWorkspaceTab: (t: WorkspaceTab) => void;

  /** Einmaliges Ziel im Setup Hub (wird nach Anzeige zurückgesetzt). */
  integrationHubSection: IntegrationHubSection | null;
  setIntegrationHubSection: (s: IntegrationHubSection | null) => void;

  /** Assistent vs. alle Integrationen (Setup Hub). */
  integrationsPanelMode: IntegrationsPanelMode;
  setIntegrationsPanelMode: (m: IntegrationsPanelMode) => void;

  /** Einmalig: geführter Assistent startet auf diesem Schritt (1=Gelato, 2=Gemini, 3=Vertex). */
  integrationWizardInitialStep: IntegrationWizardStepId | null;
  setIntegrationWizardInitialStep: (s: IntegrationWizardStepId | null) => void;

  /** Zum Integrations-Setup wechseln und optional einen Bereich öffnen (öffnet „Alle Integrationen“). */
  goToIntegration: (section: IntegrationHubSection) => void;

  /** Geführten Assistenten öffnen und Schritt fokussieren. */
  goToIntegrationWizardStep: (step: IntegrationWizardStepId) => void;

  /** Erstellen-Bereich inkl. Unter-Tab (z. B. von Etsy-Integration zu Listings). */
  goToWorkspace: (tab: WorkspaceTab) => void;

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
  setGlobalSetId: (id: string) => void;

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
    void import("../api/client").then((m) => m.clearProactiveTokenRefresh());
  },

  activeTab: "workspace",
  setActiveTab: (t) => set({ activeTab: t }),

  workspaceTab: "generator",
  setWorkspaceTab: (t) => set({ workspaceTab: t }),

  integrationHubSection: null,
  setIntegrationHubSection: (s) => set({ integrationHubSection: s }),

  integrationsPanelMode: "wizard",
  setIntegrationsPanelMode: (m) => set({ integrationsPanelMode: m }),

  integrationWizardInitialStep: null,
  setIntegrationWizardInitialStep: (s) => set({ integrationWizardInitialStep: s }),

  goToIntegration: (section) =>
    set({
      activeTab: "integrations",
      integrationsPanelMode: "all",
      integrationHubSection: section,
    }),

  goToIntegrationWizardStep: (step) =>
    set({
      activeTab: "integrations",
      integrationsPanelMode: "wizard",
      integrationWizardInitialStep: step,
      integrationHubSection: null,
    }),

  goToWorkspace: (tab) =>
    set({ activeTab: "workspace", workspaceTab: tab }),

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
  setGlobalSetId: (id) => set({ globalSetId: id }),

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
