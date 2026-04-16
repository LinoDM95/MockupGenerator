/**
 * Macht Upscale-/Vertex-Fehlertexte für Nutzer lesbar (statt Google-JSON im Klartext).
 */
const MSG_GOOGLE_INTERNAL =
  "Der Upscale-Dienst von Google (Vertex AI) hat einen internen Fehler gemeldet. " +
  "Das ist meist vorübergehend und liegt nicht an deinem Bild oder dieser App — " +
  "bitte in einigen Minuten erneut versuchen.";

const MSG_GOOGLE_OVERLOAD =
  "Der Upscale-Dienst von Google ist kurz überlastet oder nicht erreichbar. " +
  "Bitte später erneut versuchen.";

export const formatUpscaleUserMessage = (raw: string): string => {
  const t = raw.trim();
  if (!t) return t;
  const u = t.toUpperCase();

  if (
    (u.includes("INTERNAL") && (u.includes("STATUS") || u.includes("500"))) ||
    (u.includes("UPSCALE FEHLGESCHLAGEN") && u.includes("INTERNAL"))
  ) {
    return MSG_GOOGLE_INTERNAL;
  }

  if (
    u.includes("REQUEST FAILED") &&
    (u.includes("TRY AGAIN") || u.includes("MINUTES") || u.includes("SUPPORT"))
  ) {
    return MSG_GOOGLE_OVERLOAD;
  }

  if (u.includes("UNAVAILABLE") || u.includes("503")) {
    return MSG_GOOGLE_OVERLOAD;
  }

  return t;
};
