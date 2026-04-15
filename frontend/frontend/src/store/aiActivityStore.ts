import { create } from "zustand";

export type AiActivityKind = "standard" | "expert" | "info" | "grounding";

export type AiActivityEntry = {
  id: string;
  at: number;
  kind: AiActivityKind;
  title: string;
  detail?: string;
};

const MAX_ENTRIES = 80;

type AiActivityState = {
  entries: AiActivityEntry[];
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  pushAiLog: (e: Omit<AiActivityEntry, "id" | "at">) => void;
  clearAiLogs: () => void;
};

export const useAiActivityStore = create<AiActivityState>((set) => ({
  entries: [],
  panelOpen: false,
  setPanelOpen: (open) => set({ panelOpen: open }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  pushAiLog: (e) =>
    set((s) => {
      const entry: AiActivityEntry = {
        ...e,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        at: Date.now(),
      };
      const next = [entry, ...s.entries].slice(0, MAX_ENTRIES);
      return { entries: next };
    }),
  clearAiLogs: () => set({ entries: [] }),
}));
