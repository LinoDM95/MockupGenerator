/**
 * UI-Labels für den Upscaler-Bereich („Upscaler“ in Nav und Kopf).
 * Engine-Pfade: PrintFlow Cloud / PrintFlow Engine (ohne „Replicate“ im Kundenwortlaut).
 */
export type PrintflowUpscalerEngineMode = "vertex" | "replicate" | "local";

/** Sichtbarer Produkt-/Bereichsname in Nav, Screenreader, Lauf-Overlay */
export const UPSCALER_UI_PRODUCT_NAME = "Upscaler";

export const printflowUpscalerHero = {
  eyebrow: "Schritt 1",
  headline: "Upscaler",
  subline:
    "Mehr Schärfe und drucknahe Details — wähle, wo die Bildverarbeitung laufen soll. Danach legst du Motive ab und startest den Lauf.",
  stepHint: "Rechenziel wählen",
} as const;

export const printflowUpscalerEnginePicker = {
  vertex: {
    title: "Google Vertex AI",
    description: "Dein Google-Cloud-Konto (BYOK) — professionelles Imagen-Upscaling.",
  },
  /** Replicate-Backend, vermarktet als eigene Cloud-Strecke */
  hostedCloud: {
    title: "PrintFlow Cloud",
    description: "Schnelles Hosting mit Real-ESRGAN — ideal, wenn du keine eigene GPU nutzen willst.",
    disabledFootnote: "Derzeit nicht verfügbar",
  },
  local: {
    title: "PrintFlow Engine",
    description: "Lokal auf deiner Grafikkarte — ohne laufende Cloud-Kosten.",
  },
} as const;

export const displayEngineLabel = (m: PrintflowUpscalerEngineMode): string => {
  if (m === "vertex") return "Google Vertex AI (BYOK)";
  if (m === "replicate") return "PrintFlow Cloud";
  return "PrintFlow Engine (lokal)";
};

export const batchScopeLabel = (m: PrintflowUpscalerEngineMode): string => {
  if (m === "vertex") return "Vertex AI";
  if (m === "replicate") return "PrintFlow Cloud";
  return "lokal";
};

export const queueSubtitleForEngine = (
  m: PrintflowUpscalerEngineMode,
  jobCountLabel: string,
): string => {
  if (m === "vertex") {
    return `Google Vertex AI · BYOK · ${jobCountLabel}`;
  }
  if (m === "replicate") {
    return `PrintFlow Cloud · ${jobCountLabel}`;
  }
  return `PrintFlow Engine (lokal) · ${jobCountLabel}`;
};

export const modelRowLabel = (m: PrintflowUpscalerEngineMode): string => {
  if (m === "vertex") return "Vertex — imagegeneration@006";
  if (m === "replicate") return "Real-ESRGAN · PrintFlow Cloud";
  return "";
};
