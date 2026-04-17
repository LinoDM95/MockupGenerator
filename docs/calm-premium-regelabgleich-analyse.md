# Calm Premium – Regelabgleich (Projektanalyse)

**Stand:** Analyse auf Basis der Regeln in `.cursor/rules/design-system.mdc` sowie der verknüpften Frontend-Konventionen.  
**Umfang:** Schwerpunkt **Frontend** (`frontend/frontend/src`). Das Backend folgt anderen Regeln (Security, DRF) und wird hier nur kurz erwähnt.

**Hinweis:** Es wurden **keine Code-Änderungen** vorgenommen. Die folgenden Punkte sind Abweichungen oder technische Schulden **relativ zur eigenen Design-Regel**, nicht zwingend „falsch“ im Produkt.

---

## 1. Referenz: Was die Regeln verlangen (Kurz)

| Thema | Vorgabe |
|--------|---------|
| Flächen | Primär `bg-white`; sekundär `bg-slate-50` / `bg-slate-50/50` |
| Abgrenzung | `ring-1 ring-slate-900/5` statt `border border-slate-200` als **Standard** auf Karten/Panels |
| Blur | **Kein** `backdrop-blur` auf Toasts / Floating-Panels / **Karteninhalten**; **erlaubt** bei **Modal-Overlays** (Vollfläche) |
| Schatten | Kanonische Werte (Card-Shadow, Modal-Shadow); nicht beliebig `shadow-sm`/`shadow-xl` mischen |
| Formulare | Bevorzugt `Input` / `Select` mit einheitlichem Fokus (`focus:ring-4 focus:ring-indigo-500/10`) |
| Landing | Bewusste Ausnahme – muss App-Shell nicht spiegeln |

---

## 2. Gesamteinschätzung

Die Codebasis ist **nicht „perfekt“ im Sinne einer 100 %-Übereinstimmung** mit jedem Bullet der `design-system.mdc`, aber **große Teile der App** sind bereits auf Ringe, Card-Schatten und Primitives umgestellt. Verbleibende Abweichungen konzentrieren sich vor allem auf:

- **Glass/Blur** an Shell- und Editor-Stellen (bewusst für Tiefe/Lesbarkeit über dem Canvas),
- **große, ältere Modale** (z. B. Gelato-Export) mit vielen **lokalen** `border` + teils **doppelter** Abgrenzung (`border` **und** `ring`),
- **Callback-/Minimal-Seiten** und **Canvas-spezifische** UI,
- die **Button-Variante `outline`** (nutzt weiterhin `border` + `shadow-sm` im zentralen `Button.tsx` – widerspricht der „Rings statt Borders“-Formulierung für *Karten*, ist aber **konsistent als Button-Primitive**).

**Fazit:** Es gibt **gezielte Restabstände** zur eigenen Regel; nichts davon ist zwingend ein Sicherheits- oder Funktionsproblem. Eine spätere Bereinigung kann **priorisiert** (zuerst: doppelte Rahmen, dann Blur auf nicht-Overlay-Flächen) erfolgen.

---

## 3. Konkrete Auffälligkeiten (nach Kategorie)

### 3.1 Ausnahmen laut Regelwerk (kein Defizit im Sinne „Fehler“)

- **`LandingPage.tsx`:** Viel `bg-white/70`, `backdrop-blur-md` / `backdrop-blur-xl`, zusätzliche `border`-Varianten – **explizit erlaubt** als Marketing-/Hero-Ausnahme.
- **Modal-Overlays:** `Modal.tsx`, `ExportProgress.tsx`, `GelatoExportModal.tsx` (äußere Overlays mit `backdrop-blur-sm`) – **im Einklang** mit der Regel (Blur nur auf Overlay, nicht auf dem Toast-Inhalt).

### 3.2 `backdrop-blur` auf nicht-modalen / schwebenden Flächen (Regel: eigentlich vermeiden)

Diese Stellen **können** als Abweichung gelten, weil es **keine** reinen Vollbild-Modal-Overlays sind, sondern **UI-Chrome** oder **Inhalts**-nahe Layer:

| Datei | Kurzbeschreibung |
|--------|------------------|
| `App.tsx` | Header-Bar: `bg-white/95` + `backdrop-blur-md` |
| `CanvasViewport.tsx` | Floating Controls oben/unten: `bg-white/95` bzw. `bg-white/90` + `backdrop-blur` |
| `LinearLoadingBar.tsx` | Lade-Banner: `backdrop-blur-sm` auf der Fläche |
| `WorkSessionShell.tsx` | Vollflächiger Session-Overlay: `backdrop-blur-md` (starkes „Glass“) |
| `PixelGlyph.tsx` | Panel: `backdrop-blur-xl` |
| `GeneratorView.tsx` / `UpscalerView.tsx` | Dunkle Vorschau-Spalten: `backdrop-blur-sm` auf Container |
| `UpscalerView.tsx` (Before/After) | Kleine Overlays/Labels: `backdrop-blur-sm` |

**Einordnung:** Oft **UX-bedingt** (Lesbarkeit über Bild/Canvas). Die Regel ist hier **strenger als die typische Praxis**; dokumentiert als **bewusste Abweichung**, falls ihr die Regel wörtlich durchsetzen wollt.

### 3.3 `border border-slate-200` (oder ähnlich) neben oder ohne klaren Ring-Ersatz

Noch **häufig** in komplexen Views; Auswahl der auffälligsten Muster:

| Bereich | Beobachtung |
|---------|-------------|
| `GelatoExportModal.tsx` | Sehr viele lokale `border border-slate-200`; teils **zusätzlich** bereits `ring-1 ring-slate-900/5` → **doppelte** optische Kante. Metadaten-Inputs nutzen **Roh-**`<input>`/`<textarea>` mit `focus:ring-1` statt des **Input**-Fokus (`ring-4` /10). |
| `PropertiesPanel.tsx` | Root-Panel noch `border border-slate-200` + `shadow-sm` (Rest des Editors teils schon Ring/Card-Schatten). |
| `BatchQueue.tsx` | Panel: `border` **und** `ring` parallel. |
| `EtsyCallbackPage.tsx` / `PinterestCallbackPage.tsx` | Schlichte Karten mit `border` + `shadow-sm` – wenig auf Hochglanz gebracht, aber von der **Komponenten-Pflicht** (Card) abweichend. |
| `DialogHost.tsx` | Prompt-`<input>`: bewusst `border` (angleicht sich textuell dem Input-Fokus, behält aber `border` als Basis). |
| `Button.tsx` (`variant="outline"`) | `border border-slate-200` + `shadow-sm` – **Zentral-Primitive**; widerspricht der „kein border auf Karten“-Linie nicht direkt, könnte aber bei einer **strengen** Lesart global auffallen. |

### 3.4 Toasts

- **`Toaster.tsx`:** Entspricht der Regel (**solides Weiß**, Ringe, **kein** Blur). **Kein Defizit.**

### 3.5 Typografie (Regel: `font-medium` wo Lesbarkeit zählt, Meta `text-[10px]` uppercase)

- Nicht systematisch per Suche geprüft (zu viele legitime Ausnahmen für Überschriften, Captions, monospace). **Keine vollständige Abweichungsliste** – nur **Hinweis:** Stichproben in älteren Views können noch `text-sm` ohne `font-medium` zeigen; das ist **kosmetisch**, kein Muss.

### 3.6 Backend (`backend/`)

- **Calm Premium** gilt in `design-system.mdc` explizit für die **React-App**. Django-Admin, Templates (falls vorhanden) und API-only-Responses: **nicht** Gegenstand dieser Oberflächenregel.

---

## 4. Optional: sinnvolle nächste Schritte (nur Dokumentation – keine Pflicht)

1. **GelatoExportModal:** Redundanz `border`+`ring` reduzieren; wo möglich `Input`/`Textarea`-Muster aus `Input.tsx` übernehmen.  
2. **App-Header / Canvas-Floating-UI:** Entscheidung treffen: Regel lockern („Blur für Shell/Canvas-Chrome erlaubt“) **oder** Graduierung reduzieren.  
3. **Callback-Pages:** Auf `Card` + Ringe vereinheitlichen (geringer Aufwand, hohe Konsistenz).  
4. **`Button` outline:** Falls globale Einheitlichkeit mit „nur Ringe“ gewünscht: Variante auf `ring-1 ring-slate-900/5` umstellen (wirkt sich **app-weit** aus).

---

## 5. Kurzfazit

| Kriterium | Einschätzung |
|-----------|----------------|
| Regeln insgesamt | Sinnvoll umgesetzt in Kern-Primitives (Card, Modal-Overlay, Toaster, viele Views) |
| Vollständigkeit | **Nein** – Reststellen vor allem in **großen Modalen**, **Editor-Chrome**, **Glass-Shell**, **Landing** (teilweise erlaubt) |
| Handlungsbedarf | **Nur bei Wunsch nach strikter 100 %-Regeltreue**; sonst dokumentierte technische Schulden |

*Diese Datei dient der Transparenz für Reviews; sie ersetzt keine Produkt-Priorisierung.*
