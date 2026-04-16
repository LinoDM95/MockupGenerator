import type { ArtworkItem, TemplateSet } from "../types/mockup";

/** UUIDs aus API/Select können sich in Groß-/Kleinschreibung unterscheiden — Vergleich normalisieren. */
export const normalizeSetId = (id: string): string => String(id).trim().toLowerCase();

export const findTemplateSet = (
  setId: string,
  templateSets: TemplateSet[],
): TemplateSet | undefined => {
  if (!setId) return undefined;
  const n = normalizeSetId(setId);
  return templateSets.find((x) => normalizeSetId(x.id) === n);
};

/** Ob das gewählte Set mindestens eine Vorlage hat. */
export const templateSetHasTemplates = (
  setId: string,
  templateSets: TemplateSet[],
): boolean => {
  const s = findTemplateSet(setId, templateSets);
  return !!s && s.templates.length > 0;
};

/**
 * Warum ZIP-Mockups (noch) nicht möglich sind.
 * - `missing_set`: kein Set am Motiv
 * - `no_templates`: Set unbekannt oder 0 Vorlagen
 */
export type ZipBlockReason = "ok" | "missing_set" | "no_templates";

export const zipBlockReason = (
  artworks: ArtworkItem[],
  templateSets: TemplateSet[],
): ZipBlockReason => {
  if (artworks.length === 0) return "missing_set";
  if (artworks.some((a) => !a.setId)) return "missing_set";
  if (
    artworks.some(
      (a) => !templateSetHasTemplates(a.setId, templateSets),
    )
  ) {
    return "no_templates";
  }
  return "ok";
};

export const zipBlocked = (
  artworks: ArtworkItem[],
  templateSets: TemplateSet[],
): boolean => zipBlockReason(artworks, templateSets) !== "ok";

/** Toast-Texte, wenn keine ZIP erzeugt werden kann. */
export const zipBlockToastMessage = (reason: ZipBlockReason): string => {
  switch (reason) {
    case "missing_set":
      return (
        "Bitte jedem Motiv ein Vorlagen-Set zuweisen: links „Set für alle Motive“ wählen und " +
        "„Auf alle Motive anwenden“, oder in der Zeile unter dem Motiv ein Set auswählen."
      );
    case "no_templates":
      return (
        "Das gewählte Vorlagen-Set enthält keine Vorlagen. Lege unter Erstellen → Vorlagen " +
        "mindestens eine Vorlage an oder wähle ein anderes Set mit Vorlagen."
      );
    default:
      return "Es können keine Mockups erzeugt werden — prüfe die Vorlagen-Zuordnung.";
  }
};
