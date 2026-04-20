import {
  IndentedLegalPoint,
  IndentedLegalPoints,
} from "../components/legal/IndentedLegalPoints";
import { LegalPageLayout } from "../components/legal/LegalPageLayout";
import { getLegalSiteConfig } from "../lib/legal/config";
import { cn } from "../lib/cn";

export const AgbPage = () => {
  const c = getLegalSiteConfig();

  return (
    <LegalPageLayout title="Allgemeine Geschäftsbedingungen (AGB)">
      <section>
        <p
          className={cn(
            "rounded-2xl bg-slate-50/90 px-4 py-4 text-slate-800 ring-1 ring-inset ring-slate-900/5 dark:bg-slate-800/40 dark:text-slate-200 dark:ring-white/10",
          )}
        >
          <strong>Hinweis:</strong> Der folgende Text ist eine strukturierte Mustervorlage und{" "}
          <strong>ersetzt keine Rechtsberatung</strong>. Bitte durch eine Fachperson für dein
          Geschäftsmodell prüfen und anpassen.
        </p>
      </section>

      <section>
        <h2>1. Geltungsbereich</h2>
        <p>
          Diese AGB gelten für die Nutzung der Software <strong>{c.appName}</strong>, betrieben von{" "}
          <strong>{c.entityName}</strong> (nachfolgend „Anbieter“), gegenüber Verbraucher:innen und
          Unternehmer:innen (nachfolgend „Nutzer:in“), soweit nicht Individualvereinbarungen Vorrang
          haben.
        </p>
      </section>

      <section>
        <h2>2. Vertragsschluss</h2>
        <p>
          Mit Registrierung gibt die Nutzer:in ein Angebot auf Abschluss eines Nutzungsvertrags ab. Der
          Vertrag kommt zustande, sobald der Anbieter das Konto freischaltet bzw. die Registrierung
          bestätigt.
        </p>
      </section>

      <section>
        <h2>3. Leistungsgegenstand</h2>
        <p>
          Der Anbieter stellt eine Online-Anwendung zur Erstellung und Verwaltung von Mockups und
          zugehörigen Inhalten bereit. Funktionsumfang und Verfügbarkeit ergeben sich aus der jeweils
          aktuellen Produktbeschreibung.
        </p>
      </section>

      <section>
        <h2>4. Pflichten der Nutzer:in</h2>
        <p>Die Nutzer:in verpflichtet sich insbesondere:</p>
        <IndentedLegalPoints>
          <IndentedLegalPoint>Zugangsdaten geheim zu halten und Missbrauch unverzüglich zu melden;</IndentedLegalPoint>
          <IndentedLegalPoint>keine rechtswidrigen Inhalte hochzuladen oder zu verbreiten;</IndentedLegalPoint>
          <IndentedLegalPoint>
            die Anwendung nicht in einer Weise zu nutzen, die Rechte Dritter verletzt.
          </IndentedLegalPoint>
        </IndentedLegalPoints>
      </section>

      <section>
        <h2>5. Preise und Zahlung</h2>
        <p>
          Soweit kostenpflichtige Pläne angeboten werden, gelten die auf der Website oder im Checkout
          kommunizierten Preise und Laufzeiten. Die Abrechnung erfolgt über den benannten
          Zahlungsdienstleister.
        </p>
      </section>

      <section>
        <h2>6. Haftung</h2>
        <p>
          Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie nach Maßgabe des
          Produkthaftungsgesetzes. Bei leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung
          wesentlicher Vertragspflichten und begrenzt auf den typischerweise vorhersehbaren Schaden.
          Die vorstehenden Einschränkungen gelten nicht bei Verletzung von Leben, Körper oder
          Gesundheit.
        </p>
      </section>

      <section>
        <h2>7. Laufzeit und Kündigung</h2>
        <p>
          Der Nutzungsvertrag läuft auf unbestimmte Zeit, sofern nicht ein abweichender Tarif mit
          fester Laufzeit gewählt wurde. Die Kündigung kann unter Einhaltung der vereinbarten Fristen
          erfolgen; das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.
        </p>
      </section>

      <section>
        <h2>8. Änderungen der AGB</h2>
        <p>
          Der Anbieter kann diese AGB mit Wirkung für die Zukunft ändern. Nutzer:innen werden
          rechtzeitig informiert; widersprechen sie nicht innerhalb einer angemessenen Frist, gelten die
          Änderungen als angenommen, sofern gesetzlich zulässig.
        </p>
      </section>

      <section>
        <h2>9. Schlussbestimmungen</h2>
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Ist die
          Nutzer:in Verbraucher:in, bleiben zwingende Verbraucherschutzvorschriften des Staates, in dem
          sie ihren gewöhnlichen Aufenthalt haben, unberührt. Gerichtsstand für Kaufleute ist der Sitz
          des Anbieters, sofern zulässig.
        </p>
      </section>
    </LegalPageLayout>
  );
};
