import {
  IndentedLegalPoint,
  IndentedLegalPoints,
} from "../components/legal/IndentedLegalPoints";
import { LegalPageLayout } from "../components/legal/LegalPageLayout";
import { getLegalSiteConfig } from "../lib/legal/config";

export const DatenschutzPage = () => {
  const c = getLegalSiteConfig();

  return (
    <LegalPageLayout title="Datenschutzerklärung">
      <section>
        <p>
          Diese Erklärung beschreibt, wie die Webanwendung <strong>{c.appName}</strong> mit
          personenbezogenen Daten umgeht. Stand: {new Date().getFullYear()}. Bitte passe Inhalte an
          dein konkretes Hosting, Unterauftragsverarbeiter und Produktfeatures an und lasse sie
          rechtlich prüfen.
        </p>
      </section>

      <section>
        <h2>1. Verantwortliche Stelle</h2>
        <p>
          Verantwortlich im Sinne der DSGVO:
          <br />
          <strong>{c.entityName}</strong>
          <br />
          {c.addressLine1}, {c.addressLine2}, {c.country}
          <br />
          E-Mail:{" "}
          <a href={`mailto:${c.email}`} className="break-all">
            {c.email}
          </a>
        </p>
      </section>

      <section>
        <h2>2. Hosting und Infrastruktur</h2>
        <p>
          Die Anwendung und zugehörige APIs werden auf Servern eines Hosting-Anbieters betrieben
          (z. B. Render, Hetzner, AWS — bitte konkret benennen). Dabei können technische Daten
          (z. B. IP-Adresse, Zeitstempel, User-Agent) in Server-Logs verarbeitet werden.
          Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag/ vorvertragliche Maßnahmen) und Art. 6
          Abs. 1 lit. f DSGVO (Betrieb und Sicherheit der Dienste).
        </p>
      </section>

      <section>
        <h2>3. Konto und Authentifizierung</h2>
        <p>
          Bei Registrierung und Login verarbeiten wir Benutzername, E-Mail (falls angegeben) und ein
          Passwort-Hash im Backend. Für die Sitzungsverwaltung können sichere, HTTP-only Cookies
          (inkl. CSRF-Schutz) gesetzt werden. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
        </p>
      </section>

      <section>
        <h2>4. Nutzung der Anwendung (Inhalte)</h2>
        <p>
          Du kannst Vorlagen, Bilder und Metadaten speichern und verarbeiten. Diese Daten werden deinem
          Konto zugeordnet und nur im Rahmen der bereitgestellten Funktionen genutzt. Rechtsgrundlage:
          Art. 6 Abs. 1 lit. b DSGVO.
        </p>
      </section>

      <section>
        <h2>5. Dateispeicher (optional)</h2>
        <p>
          Werden Medien in einem Objektspeicher (z. B. S3-kompatibel / Cloudflare R2) abgelegt, erfolgt
          die Verarbeitung beim jeweiligen Anbieter gemäß dessen AV-Vertrag bzw.
          Standardvertragsklauseln. Rechtsgrundlage: Art. 6 Abs. 1 lit. b bzw. f DSGVO.
        </p>
      </section>

      <section>
        <h2>6. Drittanbieter-Integrationen (optional)</h2>
        <p>
          Wenn du optionale Integrationen aktivierst, können Daten an die jeweiligen Plattformen
          übermittelt werden, z. B.:
        </p>
        <IndentedLegalPoints>
          <IndentedLegalPoint>
            <strong>Etsy</strong> — OAuth und API-Aufrufe zur Shop-/Listing-Verwaltung (Verarbeitung
            gemäß Etsy-Richtlinien).
          </IndentedLegalPoint>
          <IndentedLegalPoint>
            <strong>Pinterest</strong> — OAuth und API-Aufrufe (Verarbeitung gemäß
            Pinterest-Richtlinien).
          </IndentedLegalPoint>
        </IndentedLegalPoints>
        <p>Rechtsgrundlage: Art. 6 Abs. 1 lit. a (Einwilligung über OAuth) bzw. lit. b DSGVO.</p>
      </section>

      <section>
        <h2>7. KI-Funktionen (optional)</h2>
        <p>
          Sofern KI-Dienste eingebunden sind (z. B. Google Gemini / andere Anbieter), können Eingaben
          und Metadaten zur Verarbeitung an den jeweiligen Anbieter übermittelt werden — ggf. mit
          Übermittlung in Drittländer. Es gelten die Datenverarbeitungsbedingungen des Anbieters; ggf.
          sind Standardvertragsklauseln oder Angemessenheitsbeschlüsse erforderlich. Rechtsgrundlage:
          Art. 6 Abs. 1 lit. b oder lit. a DSGVO, je nach Feature.
        </p>
      </section>

      <section>
        <h2>8. Analyse und Marketing</h2>
        <p>
          Soweit keine gesonderte Einwilligung erfolgt, setzen wir keine Tracking-Pixel für Werbezwecke
          ein. Server-Logs können zu Sicherheits- und Fehleranalyse genutzt werden (Art. 6 Abs. 1 lit.
          f DSGVO).
        </p>
      </section>

      <section>
        <h2>9. Speicherdauer</h2>
        <p>
          Wir speichern personenbezogene Daten nur so lange, wie es für die genannten Zwecke
          erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen. Kontodaten löschen wir nach
          Kündigung / Löschwunsch, soweit keine Pflicht zur Aufbewahrung entgegensteht.
        </p>
      </section>

      <section>
        <h2>10. Deine Rechte</h2>
        <p>Du hast nach Maßgabe der DSGVO insbesondere:</p>
        <IndentedLegalPoints>
          <IndentedLegalPoint>Auskunft (Art. 15 DSGVO)</IndentedLegalPoint>
          <IndentedLegalPoint>Berichtigung (Art. 16 DSGVO)</IndentedLegalPoint>
          <IndentedLegalPoint>Löschung (Art. 17 DSGVO)</IndentedLegalPoint>
          <IndentedLegalPoint>Einschränkung der Verarbeitung (Art. 18 DSGVO)</IndentedLegalPoint>
          <IndentedLegalPoint>Datenübertragbarkeit (Art. 20 DSGVO)</IndentedLegalPoint>
          <IndentedLegalPoint>Widerspruch (Art. 21 DSGVO)</IndentedLegalPoint>
        </IndentedLegalPoints>
        <p>
          Zur Geltendmachung wende dich an die oben genannte E-Mail-Adresse. Du hast zudem das Recht,
          dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
        </p>
      </section>

      <section>
        <h2>11. Änderungen</h2>
        <p>
          Wir können diese Erklärung anpassen, wenn sich Rechtslage oder Produkt ändern. Die jeweils
          aktuelle Fassung ist auf dieser Seite abrufbar.
        </p>
      </section>
    </LegalPageLayout>
  );
};
