import { LegalFooterNav } from "./LegalFooterNav";

/**
 * Fixierte Leiste mit Impressum / Datenschutz / AGB — auf allen Seiten sichtbar (nicht nur Landing).
 * `pb-16` am Seiten-Root verhindert, dass Inhalt unter die Leiste rutscht.
 */
export const GlobalLegalFooter = () => (
  <footer
    className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] ring-1 ring-slate-900/5 sm:px-6"
    role="contentinfo"
  >
    <div className="mx-auto flex max-w-7xl justify-center pb-[env(safe-area-inset-bottom,0px)]">
      <LegalFooterNav dense className="text-slate-600" />
    </div>
  </footer>
);
