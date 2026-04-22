/**
 * Pflichtangaben fürs Impressum / Rechtstexte — per Vite-ENV setzen (siehe frontend/frontend/.env.example).
 * Keine Secrets hier; nur öffentliche Kontaktdaten.
 */

const trimOrEmpty = (v: string | undefined): string => (v ?? "").trim();

export type LegalSiteConfig = {
  appName: string;
  entityName: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
  email: string;
  phone: string;
  representative: string;
  registerCourt: string;
  registerNumber: string;
  vatId: string;
  supervisoryNote: string;
};

const PLACEHOLDER = "[bitte in .env eintragen]";

export const getLegalSiteConfig = (): LegalSiteConfig => {
  const entityName = trimOrEmpty(import.meta.env.VITE_LEGAL_ENTITY_NAME);
  return {
    appName: trimOrEmpty(import.meta.env.VITE_APP_DISPLAY_NAME) || "PrintFlow",
    entityName: entityName || PLACEHOLDER,
    addressLine1: trimOrEmpty(import.meta.env.VITE_LEGAL_ADDRESS_LINE1) || PLACEHOLDER,
    addressLine2: trimOrEmpty(import.meta.env.VITE_LEGAL_ADDRESS_LINE2) || PLACEHOLDER,
    country: trimOrEmpty(import.meta.env.VITE_LEGAL_COUNTRY) || "Deutschland",
    email: trimOrEmpty(import.meta.env.VITE_LEGAL_EMAIL) || PLACEHOLDER,
    phone: trimOrEmpty(import.meta.env.VITE_LEGAL_PHONE),
    representative: trimOrEmpty(import.meta.env.VITE_LEGAL_REPRESENTATIVE),
    registerCourt: trimOrEmpty(import.meta.env.VITE_LEGAL_REGISTER_COURT),
    registerNumber: trimOrEmpty(import.meta.env.VITE_LEGAL_REGISTER_NUMBER),
    vatId: trimOrEmpty(import.meta.env.VITE_LEGAL_VAT_ID),
    supervisoryNote: trimOrEmpty(import.meta.env.VITE_LEGAL_SUPERVISORY_NOTE),
  };
};

export const legalConfigLooksIncomplete = (c: LegalSiteConfig): boolean =>
  [c.entityName, c.addressLine1, c.addressLine2, c.email].some(
    (x) => !x || x === PLACEHOLDER,
  );
