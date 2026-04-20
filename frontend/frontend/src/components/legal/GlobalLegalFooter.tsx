import { LegalFooterNav } from "./LegalFooterNav";

/**
 * Fußzeile mit Impressum / Datenschutz / AGB — am Ende der Seite im normalen Dokumentfluss
 * (nicht fixiert am Viewport). Das umgebende Layout nutzt `flex min-h-screen flex-col` + `flex-1`
 * für den Inhalt, damit die Leiste bei kurzen Seiten unten am Bildschirm „klebt“.
 */
export const GlobalLegalFooter = () => (
  <footer
    className="w-full shrink-0 border-t border-slate-200/80 bg-white px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 sm:px-6"
    role="contentinfo"
  >
    <div className="mx-auto flex max-w-7xl justify-center pb-[env(safe-area-inset-bottom,0px)]">
      <LegalFooterNav dense className="text-slate-600" />
    </div>
  </footer>
);
