import { ApiError } from "../api/client";

export const getErrorMessage = (e: unknown): string => {
  if (e instanceof ApiError) return e.getDetail();
  if (e instanceof Error) return e.message;
  if (typeof Event !== "undefined" && e instanceof Event) {
    if (e instanceof ErrorEvent && e.message) return e.message;
    return "Unerwarteter Browser-Fehler (z. B. fehlgeschlagener Netzwerk- oder Bild-Ladevorgang).";
  }
  return String(e);
};
