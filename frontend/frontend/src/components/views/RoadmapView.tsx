import { Compass, Info, Layers, Megaphone, Rocket, Sparkles, Store } from "lucide-react";

import { AppPage } from "../ui/layout/AppPage";
import { AppPageSectionHeader } from "../ui/layout/AppPageSectionHeader";
import { AppSubNavPageLayout } from "../ui/layout/AppSubNavPageLayout";
import { Card } from "../ui/primitives/Card";

type RoadmapItem = {
  title: string;
  description: string;
  icon: typeof Sparkles;
};

const inArbeit: RoadmapItem[] = [
  {
    icon: Megaphone,
    title: "Verbreiten & Pinterest",
    description:
      "Die Oberfläche für Pins, Boards und Veröffentlichung wird überarbeitet und kommt zurück, sobald der Flow stabil und klar strukturiert ist.",
  },
  {
    icon: Rocket,
    title: "Automatisierung",
    description:
      "Die Pipeline für wiederkehrende Aufgaben bleibt im Fokus: weniger Klicks von Motiv bis Export, bessere Einblicke in laufende Jobs.",
  },
  {
    icon: Store,
    title: "Etsy-Integration",
    description:
      "Listings-Editor und Shop-Anbindung sollen wieder direkt unter „Erstellen“ erreichbar sein — inklusive klarer Verbindung zum Integrations-Setup.",
  },
];

const geplant: RoadmapItem[] = [
  {
    icon: Layers,
    title: "Einheitliches Arbeits-Cockpit",
    description:
      "Generator, Vorlagen und Upscaler weiter zusammenführen: weniger Kontextwechsel, mehr Durchlauf von Upload bis Export.",
  },
  {
    icon: Sparkles,
    title: "KI & Qualität",
    description:
      "Listing-Texte, Bildverbesserung und Vorlagen-Vorschläge weiter ausbauen — immer optional und nachvollziehbar für dich.",
  },
];

export const RoadmapView = () => (
  <AppSubNavPageLayout
    title="Was als Nächstes geplant ist"
    description="Transparente Übersicht über Richtung und nächste Schritte von PrintFlow — ohne feste Termine, aber mit klarer Priorität."
  >
    <AppPage>
      <AppPageSectionHeader
        icon={Info}
        title="Hinweis zur Navigation"
        description="Die Hauptnavigation ist bewusst auf Erstellen, diese Roadmap und Integrationen fokussiert. Verbreiten, Automatisierung und der Etsy-Tab sind vorübergehend ausgeblendet, bis die jeweiligen Bereiche wieder bereitstehen."
      />

      <section className="space-y-4" aria-labelledby="roadmap-in-arbeit">
        <h2 id="roadmap-in-arbeit" className="sr-only">
          In Arbeit
        </h2>
        <AppPageSectionHeader
          icon={Compass}
          title="In Arbeit"
          description="Aktive Weiterentwicklung — diese Punkte bewegen sich zuerst."
        />
        <ul className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
          {inArbeit.map((item) => {
            const ItemIcon = item.icon;
            return (
            <li key={item.title}>
              <Card padding="md" className="h-full">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-500/15">
                    <ItemIcon size={20} strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold tracking-tight text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Card>
            </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-4" aria-labelledby="roadmap-geplant">
        <h2 id="roadmap-geplant" className="sr-only">
          Geplant
        </h2>
        <AppPageSectionHeader
          icon={Sparkles}
          title="Geplant"
          description="Als Nächstes in der Pipeline — Reihenfolge kann sich je nach Feedback verschieben."
        />
        <ul className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {geplant.map((item) => {
            const ItemIcon = item.icon;
            return (
            <li key={item.title}>
              <Card padding="md" className="h-full">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-900/5">
                    <ItemIcon size={20} strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold tracking-tight text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Card>
            </li>
            );
          })}
        </ul>
      </section>
    </AppPage>
  </AppSubNavPageLayout>
);
