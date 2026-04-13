import { useToastStore } from "../store/toastStore";

const DEFAULT_DURATION_MS = 4800;

const scheduleRemove = (id: string, durationMs: number) => {
  window.setTimeout(() => useToastStore.getState().remove(id), durationMs);
};

const push = (message: string, variant: "success" | "error" | "info", durationMs = DEFAULT_DURATION_MS) => {
  const id = useToastStore.getState().add(message, variant);
  scheduleRemove(id, durationMs);
};

export const toast = {
  success: (message: string, durationMs?: number) => push(message, "success", durationMs),
  error: (message: string, durationMs?: number) => push(message, "error", durationMs ?? 7000),
  info: (message: string, durationMs?: number) => push(message, "info", durationMs),
};
