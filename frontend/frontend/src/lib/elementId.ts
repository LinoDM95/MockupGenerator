/** Eindeutige ID für neue Editor-Elemente (muss UUID sein, damit Django sie speichern kann). */
export const newClientElementId = (): string => crypto.randomUUID();
