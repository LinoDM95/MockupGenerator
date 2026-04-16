/**
 * Ausführliche Texte für den geführten Integrations-Assistenten (Gelato → Gemini → Vertex).
 */

export type WizardStepLink = { href: string; label: string };

export type WizardStepCopy = {
  title: string;
  stepLabel: string;
  intro: string[];
  why: { heading: string; paragraphs: string[] };
  prerequisites: { heading: string; items: string[] };
  walkthrough: { heading: string; steps: { title: string; detail: string }[] };
  security: { heading: string; paragraphs: string[] };
  links: WizardStepLink[];
  afterSetup: { heading: string; paragraphs: string[] };
};

export const WIZARD_STEP_GEMINI: WizardStepCopy = {
  title: "Schritt 2: Google Gemini (KI-Texte)",
  stepLabel: "Gemini",
  intro: [
    "In diesem Schritt verbindest du die Google Gemini API mit dieser App. Damit kannst du später im Generator und im Gelato-Export automatisch Titel, Beschreibungen und Tags erzeugen – ohne dass du dieselben Texte manuell schreiben musst.",
    "Gemini ist ein separater Dienst von Vertex AI (Schritt 3): Für normale Text-KI reicht ein API-Key aus dem Google AI Studio. Vertex brauchst du erst für den Bild-Upscaler mit deinem eigenen Google-Cloud-Projekt.",
  ],
  why: {
    heading: "Warum ein API-Key?",
    paragraphs: [
      "Google stellt die Gemini-API **nutzungsbasiert** bereit. Du erstellst einen Schlüssel in deinem Google-Konto; die App speichert ihn **verschlüsselt** und sendet ihn nur serverseitig an Google – er wird dir in der Oberfläche nicht wieder im Klartext angezeigt.",
      "So bleibt dein Workflow in einer App: Mockups erzeugen, exportieren, KI-Button drücken – fertige Listing-Texte vorschlagen lassen.",
    ],
  },
  prerequisites: {
    heading: "Voraussetzungen",
    items: [
      "Ein **Google-Konto** (privat oder geschäftlich).",
      "Optional: In Google AI Studio kannst du Nutzungslimits und Abrechnung einsehen, sobald du einen Key erstellst.",
      "Stabile Internetverbindung für die erste Verbindung.",
    ],
  },
  walkthrough: {
    heading: "Schritt für Schritt: Key erstellen und hier eintragen",
    steps: [
      {
        title: "Google AI Studio öffnen",
        detail:
          "Öffne Google AI Studio über den Link unten. Melde dich mit dem Google-Konto an, mit dem du die API später auch abrechnen oder limitieren möchtest.",
      },
      {
        title: "Neuen API-Key anlegen",
        detail:
          "Navigiere zu den API-Keys (oder „Get API key“) und erstelle einen **neuen** Schlüssel für ein Projekt. Du kannst den Projektnamen frei wählen; wichtig ist der anschließend angezeigte **lange alphanumerische Key**.",
      },
      {
        title: "Key kopieren und hier einfügen",
        detail:
          "Kopiere den Key in die Zwischenablage. Füge ihn im Formular unten ein, wähle ein **Start-Modell** (z. B. Gemini 2.5 Flash für gute Balance aus Geschwindigkeit und Qualität) und klicke auf **Mit Gemini verbinden**.",
      },
      {
        title: "Nach erfolgreicher Verbindung",
        detail:
          "Du kannst das **Modell** später wechseln, **Google Search Grounding** und den **Expert-Modus** für Listings aktivieren – alles in den KI-Einstellungen unter „Alle Integrationen“.",
      },
    ],
  },
  security: {
    heading: "Sicherheit und Kosten",
    paragraphs: [
      "Behandle den API-Key wie ein Passwort: nicht in öffentlichen Repos oder Screenshots posten.",
      "Google berechnet die Gemini-API nach eigenen Preisregeln; informiere dich auf der Google-Seite zu aktuellen Kontingenten und Kosten.",
    ],
  },
  links: [
    { href: "https://aistudio.google.com/", label: "Google AI Studio" },
    { href: "https://aistudio.google.com/apikey", label: "API-Keys verwalten" },
    { href: "https://ai.google.dev/gemini-api/docs", label: "Gemini API-Dokumentation" },
  ],
  afterSetup: {
    heading: "Was du danach nutzen kannst",
    paragraphs: [
      "Im **Generator** und beim **Gelato-Export** erscheint ein KI-Button: Damit werden Vorschläge für Titel, Beschreibung und Tags erzeugt. Optional mit Websuche (Grounding) und Multi-Agent-Listing.",
      "Weiter geht es mit **Schritt 3: Vertex AI** für den **Bild-Upscaler** (eigenes Google-Cloud-Projekt, BYOK).",
    ],
  },
};

export const WIZARD_STEP_GELATO: WizardStepCopy = {
  title: "Schritt 1: Gelato (Print-on-Demand)",
  stepLabel: "Gelato",
  intro: [
    "Gelato ist dein Anschluss an Print-on-Demand: Über die Gelato-E-Commerce-API legst du Produkte an, lädst Designs hoch und synchronisierst Vorlagen (Templates) aus dem Gelato-Katalog.",
    "Du brauchst einen API-Key aus dem Gelato-Dashboard und musst anschließend einen Store auswählen, unter dem die App arbeiten soll.",
  ],
  why: {
    heading: "Warum Gelato in dieser App?",
    paragraphs: [
      "Die App rendert deine Mockups und kann Designs direkt an **Gelato-Produktvorlagen** koppeln. Ohne Verbindung fehlt die Brücke zwischen erzeugten Bildern und dem POD-Katalog.",
      "Nach der Einrichtung kannst du Template-IDs synchronisieren und vom **Export-Dialog** aus Bulk-Aktionen anstoßen (je nach Feature-Stand).",
    ],
  },
  prerequisites: {
    heading: "Voraussetzungen",
    items: [
      "Ein **Gelato-Konto** und Zugang zum Dashboard.",
      "Ein **API-Key** mit Zugriff auf die E-Commerce API (siehe Gelato-Dokumentation).",
      "Mindestens ein **Store** in Gelato, den du auswählen kannst.",
    ],
  },
  walkthrough: {
    heading: "Schritt für Schritt",
    steps: [
      {
        title: "API-Key im Dashboard finden",
        detail:
          "Öffne das Gelato-Dashboard und die Bereiche zu **API** oder **Integrationen**. Erstelle oder kopiere einen API-Key mit Berechtigung für die **E-Commerce API**.",
      },
      {
        title: "Key in der App eingeben und verbinden",
        detail:
          "Trage den Key unten ein und bestätige. Die App prüft den Key und lädt die Liste deiner **Stores**.",
      },
      {
        title: "Store wählen",
        detail:
          "Wenn mehrere Stores existieren, wähle den Shop, in dem neue Produkte angelegt werden sollen. Bei nur einem Store kann die Auswahl direkt gesetzt werden.",
      },
      {
        title: "Templates synchronisieren",
        detail:
          "Im Anschluss kannst du **Template-IDs** aus dem Gelato-Katalog eintragen und synchronisieren – dann erscheinen sie in der App für Export und Zuordnung.",
      },
    ],
  },
  security: {
    heading: "Hinweis",
    paragraphs: [
      "Der API-Key wird wie bei anderen Integrationen **verschlüsselt** gespeichert. Teile ihn nicht mit Dritten.",
    ],
  },
  links: [
    { href: "https://dashboard.gelato.com/", label: "Gelato Dashboard" },
    { href: "https://dashboard.gelato.com/docs/", label: "Gelato API-Dokumentation" },
  ],
  afterSetup: {
    heading: "Als Nächstes",
    paragraphs: [
      "In **Schritt 2** richtest du **Google Gemini** für KI-Texte im Generator und Export ein.",
      "In **Schritt 3** folgt **Google Cloud Vertex AI** für den **Bild-Upscaler** (eigenes Dienstkonto, BYOK) – unabhängig von Gemini und nutzt dein GCP-Projekt.",
    ],
  },
};

export const WIZARD_STEP_VERTEX: WizardStepCopy = {
  title: "Schritt 3: Vertex AI (Upscaler BYOK)",
  stepLabel: "Vertex",
  intro: [
    "Der Bild-Upscaler in dieser App nutzt Vertex AI (Imagen) in deinem Google-Cloud-Projekt. Dafür hinterlegst du ein Dienstkonto als JSON-Datei – Bring Your Own Key (BYOK).",
    "Das ist nicht dasselbe wie der Gemini-API-Key aus Schritt 2: Vertex läuft über die Google Cloud Console, IAM-Rollen und Abrechnung pro GCP-Projekt.",
  ],
  why: {
    heading: "Warum ein Dienstkonto?",
    paragraphs: [
      "So entscheidest du selbst über **Projekt, Region und Kosten**. Die App speichert den JSON-Schlüssel verschlüsselt und nutzt ihn nur für Upscale-Jobs, die du auslöst.",
      "Ohne Vertex-Konfiguration bleibt der Upscaler-Tab gesperrt oder zeigt Hinweise – mit korrektem Dienstkonto kannst du hochauflösende Varianten erzeugen.",
    ],
  },
  prerequisites: {
    heading: "Voraussetzungen",
    items: [
      "Ein **Google-Cloud-Projekt** mit aktivierter **Abrechnung (Billing)**.",
      "Die **Vertex AI API** für dieses Projekt aktiviert.",
      "Ein **Dienstkonto** mit der Rolle **Vertex AI User** (Vertex AI-Nutzer).",
      "Ein **JSON-Schlüssel** für dieses Dienstkonto (einmaliger Download).",
    ],
  },
  walkthrough: {
    heading: "Ausführlich: Von der Console bis zur App",
    steps: [
      {
        title: "Google Cloud Console öffnen",
        detail:
          "Gehe zur Google Cloud Console und wähle oder erstelle ein Projekt. Stelle sicher, dass für dieses Projekt eine **Zahlungsmethode** hinterlegt ist, wenn die APIs kostenpflichtig genutzt werden.",
      },
      {
        title: "Vertex AI API aktivieren",
        detail:
          "In der Console unter „APIs & Dienste“ nach **Vertex AI API** suchen und für das Projekt **aktivieren**. Ohne Aktivierung schlagen spätere Aufrufe fehl.",
      },
      {
        title: "Dienstkonto erstellen",
        detail:
          "Unter **IAM & Admin → Dienstkonten** ein neues Dienstkonto anlegen. Verwende einen erkennbaren Namen (z. B. mockup-upscaler).",
      },
      {
        title: "Rolle zuweisen",
        detail:
          "Wichtig: Dem Dienstkonto die Rolle **Vertex AI User** (Vertex AI-Nutzer) zuweisen – damit darf es die nötigen Vertex-Endpunkte nutzen.",
      },
      {
        title: "JSON-Schlüssel erzeugen",
        detail:
          "Im Dienstkonto unter **Schlüssel** einen neuen **JSON-Schlüssel** erstellen und die Datei herunterladen. Die Datei nur an einem sicheren Ort aufbewahren; sie enthält geheime Credentials.",
      },
      {
        title: "JSON in dieser App speichern",
        detail:
          "Lade die Datei unten per Drag-and-drop hoch oder füge den JSON-Inhalt in das Textfeld ein. Klicke auf **Speichern**. Die App validiert und verschlüsselt den Inhalt.",
      },
    ],
  },
  security: {
    heading: "Datenschutz und Kosten",
    paragraphs: [
      "Der JSON-Key identifiziert dein Dienstkonto gegenüber Google. Gib ihn nicht weiter; bei Verlust den Schlüssel in der Console **widerrufen** und neu erzeugen.",
      "Vertex AI wird über dein GCP-Projekt abgerechnet – beobachte Budgets und Kontingente in der Google Cloud Console.",
    ],
  },
  links: [
    { href: "https://console.cloud.google.com/", label: "Google Cloud Console" },
    { href: "https://cloud.google.com/vertex-ai/docs", label: "Vertex AI Dokumentation" },
  ],
  afterSetup: {
    heading: "Fertig",
    paragraphs: [
      "Du kannst den **Upscaler** unter „Erstellen“ nutzen, sobald die Verbindung steht. Weitere Integrationen (Etsy, R2, Pinterest) findest du unter **Alle Integrationen**.",
    ],
  },
};

export const WIZARD_STEPS = [WIZARD_STEP_GELATO, WIZARD_STEP_GEMINI, WIZARD_STEP_VERTEX] as const;
