import { ChevronLeft, ChevronRight, Wand2 } from "lucide-react";
import { LayoutGroup } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import type { IntegrationStatusResponse } from "../../api/settings";
import { fetchIntegrationStatus } from "../../api/settings";
import { useAppStore } from "../../store/appStore";
import { AISetup } from "../ai/AISetup";
import { GelatoSetup } from "../gelato/GelatoSetup";
import { AppPageSectionHeader } from "../ui/layout/AppPageSectionHeader";
import { AppTabStepButton } from "../ui/layout/AppTabStepButton";
import { Button } from "../ui/primitives/Button";
import { WIZARD_STEPS } from "./integrationWizardCopy";
import type { WizardStepCopy } from "./integrationWizardCopy";

const STEP_COUNT = 3;

/** Entfernt Markdown-ähnliche ** aus statischen Copy-Strings (kein HTML). */
const plain = (s: string) => s.replace(/\*\*/g, "");

const WizardStepContent = ({ copy }: { copy: WizardStepCopy }) => (
  <div className="space-y-6 text-sm text-slate-600">
    <div className="space-y-2">
      {copy.intro.map((p) => (
        <p key={p.slice(0, 48)} className="leading-relaxed">
          {plain(p)}
        </p>
      ))}
    </div>

    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{copy.why.heading}</h3>
      <div className="space-y-2">
        {copy.why.paragraphs.map((p) => (
          <p key={p.slice(0, 40)} className="leading-relaxed">
            {plain(p)}
          </p>
        ))}
      </div>
    </div>

    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{copy.prerequisites.heading}</h3>
      <ul className="list-disc space-y-1.5 pl-5">
        {copy.prerequisites.items.map((item) => (
          <li key={item}>{plain(item)}</li>
        ))}
      </ul>
    </div>

    <details className="group rounded-xl bg-slate-50/50 ring-1 ring-inset ring-slate-900/5">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-800 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {copy.walkthrough.heading}
          <span className="text-slate-400 group-open:rotate-0">▼</span>
        </span>
      </summary>
      <ol className="space-y-3 border-t border-slate-100 px-4 py-2 pb-4 pl-8 text-sm">
        {copy.walkthrough.steps.map((s) => (
          <li key={s.title} className="list-decimal">
            <span className="font-medium text-slate-800">{plain(s.title)}</span>
            <p className="mt-1 text-slate-600">{plain(s.detail)}</p>
          </li>
        ))}
      </ol>
    </details>

    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{copy.security.heading}</h3>
      <div className="space-y-2">
        {copy.security.paragraphs.map((p) => (
          <p key={p.slice(0, 40)} className="leading-relaxed">
            {plain(p)}
          </p>
        ))}
      </div>
    </div>

    <div className="flex flex-wrap gap-3">
      {copy.links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-indigo-600 underline-offset-2 hover:underline"
        >
          {l.label}
        </a>
      ))}
    </div>

    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{copy.afterSetup.heading}</h3>
      <div className="space-y-2">
        {copy.afterSetup.paragraphs.map((p) => (
          <p key={p.slice(0, 40)} className="leading-relaxed">
            {plain(p)}
          </p>
        ))}
      </div>
    </div>

    <div
      className="flex aspect-video items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500"
      aria-hidden
    >
      Video Placeholder
    </div>
  </div>
);

export const IntegrationSetupWizard = () => {
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<IntegrationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const integrationWizardInitialStep = useAppStore((s) => s.integrationWizardInitialStep);
  const setIntegrationWizardInitialStep = useAppStore((s) => s.setIntegrationWizardInitialStep);

  useEffect(() => {
    if (integrationWizardInitialStep == null) return;
    setStep(integrationWizardInitialStep);
    setIntegrationWizardInitialStep(null);
  }, [integrationWizardInitialStep, setIntegrationWizardInitialStep]);

  const load = useCallback(async (force?: boolean) => {
    setLoading(true);
    try {
      const s = await fetchIntegrationStatus(force ? { force: true } : undefined);
      setStatus(s);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const step1Done = !!status?.gelato;
  const step2Done = !!status?.gemini;
  const step3Done = !!status?.vertex;

  const copy = WIZARD_STEPS[step - 1];

  return (
    <div className="space-y-8">
      <div className="w-full min-w-0 space-y-6">
        <AppPageSectionHeader
          icon={Wand2}
          title="Geführter Einrichtungsassistent"
          description="Drei Schritte: Gelato → Gemini → Vertex. Nutze „Weiter“, sobald du den jeweiligen Schritt in der App abgeschlossen hast."
        />

        <LayoutGroup>
          <ol
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
            aria-label="Einrichtungsschritte"
          >
            {[1, 2, 3].map((n) => {
              const done = n === 1 ? step1Done : n === 2 ? step2Done : step3Done;
              const active = step === n;
              return (
                <li key={n} className="flex flex-1 items-center gap-2">
                  <AppTabStepButton
                    active={active}
                    done={done}
                    stepNumber={n}
                    activePillLayoutId="integration-wizard-step-pill"
                    onClick={() => {
                      setStep(n);
                      void load(true);
                    }}
                  >
                    {n}. {WIZARD_STEPS[n - 1].stepLabel}
                  </AppTabStepButton>
                  {n < STEP_COUNT ? (
                    <ChevronRight className="hidden h-4 w-4 shrink-0 text-slate-300 sm:block" aria-hidden />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </LayoutGroup>
        {loading ? (
          <p className="text-xs text-slate-500">Status wird aktualisiert…</p>
        ) : null}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 sm:p-6">
        <h3 className="text-base font-semibold text-slate-900">{plain(copy.title)}</h3>
        <WizardStepContent copy={copy} />

        <div className="mt-8 border-t border-slate-100 pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            In dieser App
          </p>
          {step === 1 ? (
            <GelatoSetup hubSettingsMode />
          ) : step === 2 ? (
            <AISetup hubSettingsMode wizardSection="gemini" />
          ) : (
            <AISetup hubSettingsMode wizardSection="vertex" />
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
          <Button
            type="button"
            variant="outline"
            disabled={step <= 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Zurück
          </Button>
          {step < STEP_COUNT ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setStep((s) => Math.min(STEP_COUNT, s + 1));
                void load(true);
              }}
            >
              Weiter
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <p className="text-sm text-slate-500">
              Letzter Schritt. Feintuning jederzeit unter „Alle Integrationen“.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
