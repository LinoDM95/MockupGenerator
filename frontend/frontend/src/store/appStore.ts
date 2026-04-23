import { create } from "zustand";

import { isIntegrationHubUiEnabled, type HubTabId } from "../lib/common/integrationAvailability";
import { appNavigateTo, workspaceUrlSegmentFromTab } from "../lib/appNavigation";
import { toast } from "../lib/ui/toast";
import type { ArtworkItem, Template, TemplateSet } from "../types/mockup";

/** Hauptnavigation (Sidebar): Erstellen, Publizieren, Integrationen. */
export type AppTab = "workspace" | "integrations" | "publish";

/** Unterbereich „Publizieren“ (Sidebar). */
export type PublishTab = "etsy" | "marketing" | "automation";

/** Unter-Tabs im Bereich „Erstellen“. */
export type WorkspaceTab = "generator" | "templates" | "upscaler";

/** Zielbereich im zentralen Integrations-Setup (Setup Hub). */
export type IntegrationHubSection = HubTabId;

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
  /** null = Session noch nicht geprüft (Hydration). */
  isAuthenticated: boolean | null;
  setAuthenticated: (v: boolean | null) => void;
  logoutLocal: () => void;
  logout: () => Promise<void>;

  activeTab: AppTab;
  setActiveTab: (t: AppTab) => void;

  workspaceTab: WorkspaceTab;
  setWorkspaceTab: (t: WorkspaceTab) => void;

  publishTab: PublishTab | null;
  setPublishTab: (t: PublishTab | null) => void;

  /** Einmaliges Ziel im Setup Hub (wird nach Anzeige zurückgesetzt). */
  integrationHubSection: IntegrationHubSection | null;
  setIntegrationHubSection: (s: IntegrationHubSection | null) => void;

  /** Zum Integrations-Setup wechseln und optional einen Bereich öffnen. */
  goToIntegration: (section: IntegrationHubSection) => void;

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

  /** True während Batch-Jobs (Generator, Upscaler): Header/Unter-Tabs nicht wechseln. */
  navigationLocked: boolean;
  setNavigationLocked: (locked: boolean) => void;

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
  isAuthenticated: null,
  setAuthenticated: (v) => set({ isAuthenticated: v }),
  logoutLocal: () => {
    void import("../api/settings").then((m) => m.invalidateIntegrationStatusClientCache());
    void import("../api/ai").then((m) => m.invalidateAiStatusClientCache());
    void import("../api/gelato").then((m) => m.invalidateGelatoClientCache());
    void import("../api/auth").then((m) => m.invalidateCurrentUserClientCache());
    void import("../api/sets").then((m) => m.invalidateTemplateSetsListCache());
    set({ isAuthenticated: false, templateSets: [] });
  },
  logout: async () => {
    const { apiLogout } = await import("../api/auth");
    try {
      await apiLogout();
    } catch {
      /* Session ggf. schon ungültig */
    }
    get().logoutLocal();
  },

  activeTab: "workspace",
  setActiveTab: (t) => {
    const s = get();
    if (t === "workspace") {
      appNavigateTo(`/app/erstellen/${workspaceUrlSegmentFromTab(s.workspaceTab)}`);
      set({ activeTab: "workspace", publishTab: null });
    } else if (t === "integrations") {
      appNavigateTo("/app/integrationen/alle");
      set({ activeTab: "integrations", publishTab: null });
    } else if (t === "publish") {
      const pt = s.publishTab ?? "etsy";
      appNavigateTo(`/app/publizieren/${pt}`);
      set({ activeTab: "publish", publishTab: pt });
    }
  },

  workspaceTab: "generator",
  setWorkspaceTab: (t) => set({ workspaceTab: t }),

  publishTab: null,
  setPublishTab: (t) => set({ publishTab: t }),

  integrationHubSection: null,
  setIntegrationHubSection: (s) => set({ integrationHubSection: s }),

  goToIntegration: (section) => {
    if (!isIntegrationHubUiEnabled(section)) {
      toast.info("Diese Integration ist derzeit noch nicht freigeschaltet.");
      appNavigateTo("/app/integrationen/alle");
      set({
        activeTab: "integrations",
        integrationHubSection: null,
        publishTab: null,
      });
      return;
    }
    appNavigateTo("/app/integrationen/alle");
    set({
      activeTab: "integrations",
      integrationHubSection: section,
      publishTab: null,
    });
  },

  goToWorkspace: (tab) => {
    appNavigateTo(`/app/erstellen/${workspaceUrlSegmentFromTab(tab)}`);
    set({ activeTab: "workspace", workspaceTab: tab, publishTab: null });
  },

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

  navigationLocked: false,
  setNavigationLocked: (locked) => set({ navigationLocked: locked }),

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
