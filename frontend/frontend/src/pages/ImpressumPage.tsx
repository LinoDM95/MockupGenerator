import { LegalPageLayout } from "../components/legal/LegalPageLayout";
import { getLegalSiteConfig } from "../lib/legal/config";

export const ImpressumPage = () => {
  const c = getLegalSiteConfig();

  return (
    <LegalPageLayout title="Impressum">
      <section>
        <p>
          Informationspflichten nach Telemediengesetz (TMG) bzw. Rundfunkstaatsvertrag (RStV), sofern
          einschlägig. Bitte trage die fehlenden Pflichtangaben für dein Unternehmen in den
          Umgebungsvariablen <code>VITE_LEGAL_*</code> ein und lasse den Text ggf. von einer
          Rechtsberatung prüfen.
        </p>
      </section>

      <section>
        <h2>Diensteanbieter</h2>
        <p>
          <strong>{c.entityName}</strong>
          <br />
          {c.addressLine1}
          <br />
          {c.addressLine2}
          <br />
          {c.country}
        </p>
      </section>

      <section>
        <h2>Kontakt</h2>
        <p>
          E-Mail:{" "}
          <a href={`mailto:${c.email}`} className="break-all">
            {c.email}
          </a>
          {c.phone ? (
            <>
              <br />
              Telefon: <a href={`tel:${c.phone.replace(/\s/g, "")}`}>{c.phone}</a>
            </>
          ) : null}
        </p>
      </section>

      {c.representative ? (
        <section>
          <h2>Vertretungsberechtigte</h2>
          <p>{c.representative}</p>
        </section>
      ) : null}

      {c.registerCourt || c.registerNumber ? (
        <section>
          <h2>Handelsregister</h2>
          <p>
            {c.registerCourt ? <>{c.registerCourt}</> : null}
            {c.registerCourt && c.registerNumber ? <br /> : null}
            {c.registerNumber ? <>Registernummer: {c.registerNumber}</> : null}
          </p>
        </section>
      ) : null}

      {c.vatId ? (
        <section>
          <h2>Umsatzsteuer-ID</h2>
          <p>{c.vatId}</p>
        </section>
      ) : null}

      {c.supervisoryNote ? (
        <section>
          <h2>Aufsicht / Berufsrecht</h2>
          <p className="whitespace-pre-line">{c.supervisoryNote}</p>
        </section>
      ) : null}

      <section>
        <h2>EU-Streitschlichtung</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
          <a href="https://ec.europa.eu/consumers/odr/" rel="noopener noreferrer" target="_blank">
            https://ec.europa.eu/consumers/odr/
          </a>
          . Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen, sofern keine gesetzliche Pflicht besteht.
        </p>
      </section>

      <section>
        <h2>Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen
          Gesetzen verantwortlich. Für fremde Inhalte und Übermittlungen gelten die gesetzlichen
          Haftungsbeschränkungen für Diensteanbieter (u. a. TMG): eine Überwachungspflicht für fremde
          Informationen besteht grundsätzlich nicht.
        </p>
      </section>

      <section>
        <h2>Haftung für Links</h2>
        <p>
          Unser Angebot enthält ggf. Links zu externen Websites Dritter, auf deren Inhalte wir keinen
          Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
          verantwortlich.
        </p>
      </section>
    </LegalPageLayout>
  );
};
