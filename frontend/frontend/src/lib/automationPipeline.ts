import type { AutomationJobResponse, ImageTaskRow } from "../api/automation";

/** Reihenfolge muss zu Backend ImageTask.Status passen. */
export const PIPELINE_STEPS = [
  {
    id: "upscale",
    title: "Hochskalierung",
    description: "Bilder für die weitere Verarbeitung vorbereiten (Vertex/Upscaler-Stub).",
  },
  {
    id: "seo",
    title: "SEO & Texte",
    description: "Titel, Tags und Beschreibung erzeugen (KI-Stub).",
  },
  {
    id: "mockups",
    title: "Mockups",
    description: "Serverseitige Vorlagen aus deinem Set pro Motiv rendern.",
  },
  {
    id: "gelato",
    title: "Gelato",
    description: "Design an Print-on-Demand anbinden (Stub).",
  },
  {
    id: "zip",
    title: "ZIP & Abschluss",
    description: "Alle Mockups packen und Download bereitstellen.",
  },
] as const;

const STEP_INDEX: Record<string, number> = {
  pending: 0,
  upscaling: 1,
  seo: 2,
  mockups: 3,
  gelato: 4,
  done: 5,
  error: -1,
};

/** 1..4 = Arbeitsphasen; 5 = fertig pro Motiv; 0 = noch nicht gestartet. */
export const taskPhaseIndex = (status: string): number => STEP_INDEX[status] ?? 0;

export type StepCounts = {
  /** gerade in dieser exakten Phase */
  active: number;
  /** diese Phase bereits abgeschlossen (weiter hinten in der Pipeline) */
  done: number;
  /** noch nicht erreicht */
  waiting: number;
  /** Motiv fehlgeschlagen (gilt als „sichtbar“ pro Motiv) */
  failed: number;
};

const PHASE_ORDER: Record<"upscaling" | "seo" | "mockups" | "gelato", number> = {
  upscaling: 1,
  seo: 2,
  mockups: 3,
  gelato: 4,
};

export function countTasksInPhase(
  tasks: ImageTaskRow[],
  phase: "upscaling" | "seo" | "mockups" | "gelato",
): StepCounts {
  const cur = PHASE_ORDER[phase];
  let active = 0;
  let done = 0;
  let waiting = 0;
  let failed = 0;

  for (const t of tasks) {
    if (t.status === "error") {
      failed++;
      continue;
    }
    if (t.status === "done") {
      done++;
      continue;
    }
    const p = STEP_INDEX[t.status] ?? 0;
    if (p === cur) active++;
    else if (p > cur) done++;
    else waiting++;
  }
  return { active, done, waiting, failed };
}

/**
 * „langsamstes“ Motiv bestimmt die dominante Etappe (Straggler),
 * damit große Batches verständlich bleiben.
 */
export type StragglerPhase =
  | "queued"
  | "upscale"
  | "seo"
  | "mockups"
  | "gelato"
  | "zip";

/** Langsamstes Motiv bestimmt die gut sichtbare Etappe (gleiche IDs wie PIPELINE_STEPS). */
export function stragglerPhaseKey(tasks: ImageTaskRow[]): StragglerPhase {
  const nonTerminal = tasks.filter(
    (t) => t.status !== "done" && t.status !== "error",
  );
  if (nonTerminal.length === 0) {
    return "zip";
  }
  const minP = Math.min(
    ...nonTerminal.map((t) => STEP_INDEX[t.status] ?? 99),
  );
  if (minP <= 0) return "queued";
  if (minP === 1) return "upscale";
  if (minP === 2) return "seo";
  if (minP === 3) return "mockups";
  if (minP === 4) return "gelato";
  return "zip";
}

export function zipStepVisual(
  job: AutomationJobResponse,
): "pending" | "running" | "done" | "error" {
  if (job.status === "failed") return "error";
  if (job.status === "completed") return "done";
  const allTerminal = job.tasks.every(
    (t) => t.status === "done" || t.status === "error",
  );
  if (job.status === "processing" && allTerminal && job.tasks.length > 0) {
    return "running";
  }
  return "pending";
}

export function formatTaskLabel(t: ImageTaskRow): string {
  if (t.generated_title?.trim()) return t.generated_title;
  const fromPath = t.original_image?.split("/").pop()?.split("?")[0] ?? "";
  if (fromPath) return fromPath;
  return t.id.slice(0, 8);
}

export function statusDE(status: string): string {
  const m: Record<string, string> = {
    pending: "Warteschlange",
    upscaling: "Hochskalierung",
    seo: "SEO & Texte",
    mockups: "Mockups",
    gelato: "Gelato",
    done: "Fertig",
    error: "Fehler",
  };
  return m[status] ?? status;
}
