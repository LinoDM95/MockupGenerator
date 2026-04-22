/**
 * Macht Upscale-API-Fehlertexte für Nutzer lesbar (statt langer Anbieter-Roh-JSON-Fragmente).
 */
const MSG_UPSCALE_INTERNAL =
  "Der Upscale-Dienst hat einen internen Fehler gemeldet. " +
  "Das ist meist vorübergehend und liegt meist nicht an deinem Bild — " +
  "bitte in einigen Minuten erneut versuchen.";

const MSG_UPSCALE_OVERLOAD =
  "Der Upscale-Dienst ist kurz überlastet oder nicht erreichbar. " +
  "Bitte später erneut versuchen.";

export const formatUpscaleUserMessage = (raw: string): string => {
  const t = raw.trim();
  if (!t) return t;
  const u = t.toUpperCase();

  if (
    (u.includes("INTERNAL") && (u.includes("STATUS") || u.includes("500"))) ||
    (u.includes("UPSCALE FEHLGESCHLAGEN") && u.includes("INTERNAL"))
  ) {
    return MSG_UPSCALE_INTERNAL;
  }

  if (
    u.includes("REQUEST FAILED") &&
    (u.includes("TRY AGAIN") || u.includes("MINUTES") || u.includes("SUPPORT"))
  ) {
    return MSG_UPSCALE_OVERLOAD;
  }

  if (u.includes("UNAVAILABLE") || u.includes("503")) {
    return MSG_UPSCALE_OVERLOAD;
  }

  return t;
};
