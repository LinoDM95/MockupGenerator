import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Package,
  Rocket,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AutomationJobResponse, ImageTaskRow } from "../../api/automation";
import {
  createAutomationJob,
  getAutomationJob,
} from "../../api/automation";
import { useLoadTemplateSets } from "../../hooks/useLoadTemplateSets";
import {
  PIPELINE_STEPS,
  countTasksInPhase,
  formatTaskLabel,
  statusDE,
  stragglerPhaseKey,
  taskPhaseIndex,
  type StragglerPhase,
  zipStepVisual,
  type StepCounts,
} from "../../lib/automationPipeline";
import { cn } from "../../lib/cn";
import { getErrorMessage } from "../../lib/error";
import { toast } from "../../lib/toast";
import { useAppStore } from "../../store/appStore";
import { AppPage } from "../ui/AppPage";
import { Button } from "../ui/Button";

const POLL_MS = 2000;
const MODEL_OPTIONS = [
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Stub)" },
  { value: "gemini-2.5-pro-preview", label: "Gemini 2.5 Pro (Stub)" },
];

const GELATO_PRESETS = [
  { value: "default_draft", label: "Default Draft" },
  { value: "poster_a3", label: "Poster A3" },
];

const PHASE_KEYS: Array<"upscaling" | "seo" | "mockups" | "gelato"> = [
  "upscaling",
  "seo",
  "mockups",
  "gelato",
];

/** Welche der vier Arbeitsphasen-Karten gerade „aktiv“ ist (Straggler = gleiche IDs wie PIPELINE_STEPS). */
const isWorkStepHot = (
  pipelineStepId: (typeof PIPELINE_STEPS)[number]["id"],
  straggler: StragglerPhase,
): boolean => {
  if (straggler === "zip") return false;
  if (straggler === "queued") return pipelineStepId === "upscale";
  return straggler === pipelineStepId;
};

function DotRail({ task }: { task: ImageTaskRow }) {
  const order = PHASE_KEYS;
  const p = taskPhaseIndex(task.status);
  const err = task.status === "error";
  const doneAll = task.status === "done";

  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-1.5"
      aria-label="Phasen dieses Motivs"
    >
      {order.map((key, i) => {
        const need = i + 1;
        const passed = doneAll || (!err && p > need);
        const live = !err && !doneAll && p === need && task.status === key;
        return (
          <div key={key} className="flex items-center gap-1.5">
            {i > 0 ? (
              <span
                className={cn(
                  "h-0.5 w-4 rounded-full",
                  passed ? "bg-emerald-300" : "bg-slate-200",
                )}
              />
            ) : null}
            <span
              title={key}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold",
                err
                  ? "bg-red-100 text-red-700"
                  : passed
                    ? "bg-emerald-500 text-white"
                    : live
                      ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                      : "bg-slate-100 text-slate-400",
              )}
            >
              {passed ? (
                <CheckCircle2 size={14} strokeWidth={2.5} />
              ) : live ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <span>{i + 1}</span>
              )}
            </span>
          </div>
        );
      })}
      <span
        className={cn(
          "ml-2 h-7 w-7 rounded-full text-[10px] font-bold",
          doneAll
            ? "flex items-center justify-center bg-emerald-500 text-white"
            : err
              ? "flex items-center justify-center bg-red-100 text-red-600"
              : "flex items-center justify-center border border-dashed border-slate-300 bg-white text-slate-400",
        )}
        title="ZIP / Abschluss"
      >
        {doneAll ? <CheckCircle2 size={14} /> : err ? "!" : <Package size={12} />}
      </span>
    </div>
  );
}

function StepCard({
  title,
  short,
  counts,
  hot,
  stepDone,
  zipState,
  isZip,
}: {
  title: string;
  short: string;
  counts: StepCounts | null;
  hot: boolean;
  stepDone: boolean;
  zipState?: ReturnType<typeof zipStepVisual>;
  isZip?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative min-w-[140px] flex-1 rounded-xl border p-3 transition-all duration-300",
        stepDone && "border-emerald-200 bg-emerald-50/80",
        !stepDone && hot && "border-violet-400 bg-violet-50/90 shadow-md shadow-violet-100 ring-2 ring-violet-100",
        !stepDone && !hot && "border-slate-200 bg-white",
      )}
    >
      {hot && !stepDone ? (
        <span className="absolute -right-1 -top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-40" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-violet-500" />
        </span>
      ) : null}
      <p className="text-xs font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-[11px] leading-snug text-slate-600">{short}</p>
      {isZip && zipState === "running" ? (
        <div className="mt-2 space-y-1">
          <p className="text-xs font-medium text-violet-700">ZIP wird erstellt…</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-violet-100">
            <div className="studio-linear-bar-fill h-full w-[45%] rounded-full bg-violet-600" />
          </div>
        </div>
      ) : counts ? (
        <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-600">
          {counts.active > 0 ? (
            <div className="col-span-2 flex items-center gap-1 text-violet-700">
              <Loader2 size={10} className="animate-spin shrink-0" />
              <span>
                {counts.active} aktiv
              </span>
            </div>
          ) : null}
          <div>
            <dt className="sr-only">Fertig</dt>
            <dd>{counts.done} fertig</dd>
          </div>
          <div className="text-right">
            <dt className="sr-only">Wartend</dt>
            <dd>{counts.waiting} warten</dd>
          </div>
          {counts.failed > 0 ? (
            <div className="col-span-2 text-red-600">
              {counts.failed} mit Fehler
            </div>
          ) : null}
        </dl>
      ) : null}
      {isZip && zipState === "done" ? (
        <p className="mt-2 text-xs font-medium text-emerald-700">Bereit zum Download</p>
      ) : null}
      {isZip && zipState === "error" ? (
        <p className="mt-2 text-xs text-red-600">ZIP konnte nicht erstellt werden.</p>
      ) : null}
    </div>
  );
}

function RunDashboard({
  job,
  lastPolledAt,
  onNewJob,
}: {
  job: AutomationJobResponse;
  lastPolledAt: string | null;
  onNewJob: () => void;
}) {
  const tasks = job.tasks;
  const n = tasks.length;
  const straggler = stragglerPhaseKey(tasks);
  const zipV = zipStepVisual(job);
  const pct = job.progress_percentage ?? 0;

  const countsByPhase = useMemo(() => {
    return {
      upscaling: countTasksInPhase(tasks, "upscaling"),
      seo: countTasksInPhase(tasks, "seo"),
      mockups: countTasksInPhase(tasks, "mockups"),
      gelato: countTasksInPhase(tasks, "gelato"),
    };
  }, [tasks]);

  const upscaleDone =
    n > 0 &&
    tasks.every(
      (t) =>
        t.status === "error" ||
        ["seo", "mockups", "gelato", "done"].includes(t.status),
    );
  const seoDone =
    n > 0 &&
    tasks.every(
      (t) =>
        t.status === "error" ||
        ["mockups", "gelato", "done"].includes(t.status),
    );
  const mockDone =
    n > 0 &&
    tasks.every(
      (t) => t.status === "error" || ["gelato", "done"].includes(t.status),
    );
  const gelDone =
    n > 0 &&
    tasks.every((t) => t.status === "error" || t.status === "done");

  const errorTasks = tasks.filter((t) => t.status === "error");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-b from-white to-slate-50/50 p-6 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Pipeline läuft
            </h2>
            <p className="font-mono text-xs text-slate-500">{job.id}</p>
            {job.mockup_set_name ? (
              <p className="mt-1 text-sm text-slate-700">
                Vorlagen-Set:{" "}
                <span className="font-medium text-slate-900">
                  {job.mockup_set_name}
                </span>
              </p>
            ) : null}
            <p className="mt-2 text-xs text-slate-500">
              Motive gesamt: <span className="font-medium">{n}</span>
              {lastPolledAt ? (
                <>
                  {" "}
                  · zuletzt aktualisiert: {lastPolledAt}
                </>
              ) : null}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                job.status === "completed"
                  ? "bg-emerald-100 text-emerald-800"
                  : job.status === "failed"
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-100 text-amber-900",
              )}
            >
              {job.status === "processing"
                ? "Verarbeitung"
                : job.status === "completed"
                  ? "Abgeschlossen"
                  : job.status === "failed"
                    ? "Fehlgeschlagen"
                    : job.status}
            </span>
            <Button variant="outline" type="button" className="text-xs" onClick={onNewJob}>
              Neuen Job anlegen
            </Button>
          </div>
        </div>

        {job.status === "failed" && job.error_message ? (
          <div
            role="alert"
            className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Job-Fehler</p>
              <p className="mt-1 text-xs leading-relaxed">{job.error_message}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Gesamtfortschritt (alle Motive)</span>
            <span className="font-semibold text-violet-700">{pct}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full max-w-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ ease: "linear", duration: 0.25 }}
            />
          </div>
        </div>

        <div className="relative mt-8">
          <div
            className="pointer-events-none absolute left-0 right-0 top-[22px] z-0 h-1 rounded-full bg-slate-200"
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute left-0 top-[22px] z-0 h-1 max-w-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
            initial={false}
            animate={{ width: `${Math.min(100, pct)}%` }}
            transition={{ ease: "linear", duration: 0.3 }}
            aria-hidden
          />

          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-3">
            {PIPELINE_STEPS.slice(0, 4).map((meta, idx) => {
              const key = PHASE_KEYS[idx]!;
              const c = countsByPhase[key];
              const workHot = n > 0 && isWorkStepHot(meta.id, straggler);
              let stepDone = false;
              if (idx === 0) stepDone = upscaleDone;
              if (idx === 1) stepDone = seoDone;
              if (idx === 2) stepDone = mockDone;
              if (idx === 3) stepDone = gelDone;

              return (
                <StepCard
                  key={meta.id}
                  title={meta.title}
                  short={meta.description}
                  counts={c}
                  hot={workHot}
                  stepDone={stepDone && n > 0}
                />
              );
            })}
            <StepCard
              title={PIPELINE_STEPS[4]!.title}
              short={PIPELINE_STEPS[4]!.description}
              counts={null}
              hot={zipV === "running" || (straggler === "zip" && zipV === "pending")}
              stepDone={zipV === "done"}
              zipState={zipV}
              isZip
            />
          </div>
        </div>
      </div>

      {errorTasks.length > 0 ? (
        <div
          role="region"
          aria-label="Fehler pro Motiv"
          className="rounded-xl border border-red-100 bg-red-50/50 p-4"
        >
          <p className="text-sm font-semibold text-red-900">
            Fehler bei {errorTasks.length} Motiv
            {errorTasks.length === 1 ? "" : "en"}
          </p>
          <ul className="mt-2 space-y-2">
            {errorTasks.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-red-100 bg-white px-3 py-2 text-xs text-red-900"
              >
                <span className="font-medium">{formatTaskLabel(t)}</span>
                {t.error_message ? (
                  <p className="mt-1 leading-relaxed text-red-800">{t.error_message}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Motive im Detail
        </p>
        <ul className="mt-3 max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {tasks.map((t) => (
            <li
              key={t.id}
              className={cn(
                "rounded-xl p-3 transition-colors ring-1 ring-inset",
                t.status === "error"
                  ? "bg-red-50/30 ring-red-500/20"
                  : "bg-slate-50/50 ring-slate-900/5",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {formatTaskLabel(t)}
                  </p>
                  <p className="text-[11px] text-slate-500">{t.id}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    t.status === "done"
                      ? "bg-emerald-100 text-emerald-800"
                      : t.status === "error"
                        ? "bg-red-100 text-red-800"
                        : "bg-violet-100 text-violet-800",
                  )}
                >
                  {statusDE(t.status)}
                </span>
              </div>
              <DotRail task={t} />
              {t.status === "error" && t.error_message ? (
                <p className="mt-2 rounded-lg bg-white/80 px-2 py-1.5 text-[11px] leading-relaxed text-red-800">
                  {t.error_message}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {job.status === "completed" && job.result_zip_url ? (
        <div className="flex justify-center rounded-xl border border-emerald-100 bg-emerald-50/50 p-6">
          <a
            href={job.result_zip_url}
            download
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700"
          >
            <Package size={18} />
            ZIP herunterladen (alle Mockups)
          </a>
        </div>
      ) : null}
    </div>
  );
}

export const AutomationView = () => {
  const templateSets = useAppStore((s) => s.templateSets);
  const globalSetId = useAppStore((s) => s.globalSetId);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setWorkspaceTab = useAppStore((s) => s.setWorkspaceTab);
  const setEditingSetId = useAppStore((s) => s.setEditingSetId);
  useLoadTemplateSets({ silent: true });

  const [mockupSetId, setMockupSetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<AutomationJobResponse | null>(null);
  const [lastPolledAt, setLastPolledAt] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!templateSets.length) {
      setMockupSetId("");
      return;
    }
    setMockupSetId((prev) => {
      if (prev && templateSets.some((x) => x.id === prev)) {
        return prev;
      }
      const preferred = templateSets.find((x) => x.id === globalSetId)?.id;
      return preferred ?? templateSets[0]!.id;
    });
  }, [templateSets, globalSetId]);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const touchPolledAt = useCallback(() => {
    const d = new Date();
    setLastPolledAt(
      d.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    );
  }, []);

  useEffect(() => {
    if (!jobId) return;

    const tick = () => {
      void (async () => {
        try {
          const j = await getAutomationJob(jobId);
          setJob(j);
          touchPolledAt();
          if (j.status === "completed" || j.status === "failed") {
            stopPoll();
            if (j.status === "completed") {
              toast.success("Automation abgeschlossen.");
            } else {
              toast.error("Automation mit Fehler beendet.");
            }
          }
        } catch {
          stopPoll();
        }
      })();
    };

    void tick();
    pollRef.current = setInterval(tick, POLL_MS);

    return () => stopPoll();
  }, [jobId, stopPoll, touchPolledAt]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("images") as HTMLInputElement;
    if (!input?.files?.length) {
      toast.error("Bitte mindestens ein Bild auswählen.");
      return;
    }
    if (!mockupSetId) {
      toast.error("Bitte ein Vorlagen-Set wählen.");
      return;
    }
    const fd = new FormData(form);
    fd.set("mockup_set", mockupSetId);

    setBusy(true);
    setJob(null);
    setJobId(null);
    setLastPolledAt(null);
    void (async () => {
      try {
        const created = await createAutomationJob(fd);
        setJobId(created.id);
        setJob(created);
        touchPolledAt();
        toast.success("Pipeline gestartet — Verlauf unten.");
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setBusy(false);
      }
    })();
  };

  const handleNewJob = useCallback(() => {
    stopPoll();
    setJobId(null);
    setJob(null);
    setLastPolledAt(null);
  }, [stopPoll]);

  return (
    <AppPage>
      <div
        role="status"
        className="rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-950 ring-1 ring-inset ring-amber-500/20"
      >
        <p className="font-semibold">Automation — Vorschau, nicht produktionsreif</p>
        <p className="mt-1 text-xs text-amber-900/90">
          Pipeline und Anbindungen sind experimentell. Nutze für zuverlässige Abläufe
          den Bereich <span className="font-medium">Erstellen</span> (Generator, Vorlagen)
          und <span className="font-medium">Integrationen</span>.
        </p>
      </div>

      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 opacity-90">
          <Rocket size={24} className="text-violet-600" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Automation</h1>
        <p className="mt-1 text-sm text-slate-500">
          Massen-Pipeline mit klaren Etappen — auch bei vielen Motiven siehst du,
          wo gerade gearbeitet wird.
        </p>
      </div>

      {templateSets.length === 0 ? (
        <div
          role="status"
          className="rounded-xl bg-amber-50 px-4 py-4 text-sm text-amber-950 ring-1 ring-inset ring-amber-500/20"
        >
          <p className="font-medium">Keine Vorlagen-Sets</p>
          <p className="mt-1 text-xs text-amber-900/90">
            Lege zuerst unter{" "}
            <span className="font-semibold">Vorlagen-Studio</span> Sets an.
          </p>
          <Button
            variant="outline"
            type="button"
            className="mt-3 border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
            onClick={() => {
              setActiveTab("workspace");
              setWorkspaceTab("templates");
              setEditingSetId(null);
            }}
          >
            Zum Vorlagen-Studio
          </Button>
        </div>
      ) : null}

      {!jobId ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5"
        >
          <p className="text-sm font-medium text-slate-800">Voreinstellungen</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">KI-Modell (SEO)</span>
              <select
                name="ai_model_name"
                className="mt-1 w-full rounded-xl bg-white px-3 py-2 text-sm shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5"
                defaultValue={MODEL_OPTIONS[0]!.value}
                required
              >
                {MODEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Upscale-Faktor</span>
              <select
                name="upscale_factor"
                className="mt-1 w-full rounded-xl bg-white px-3 py-2 text-sm shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5"
                defaultValue="4"
                required
              >
                <option value="2">2×</option>
                <option value="4">4×</option>
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">
                Vorlagen-Set (aus Vorlagen-Studio)
              </span>
              <select
                name="mockup_set"
                value={mockupSetId}
                onChange={(e) => setMockupSetId(e.target.value)}
                className="mt-1 w-full rounded-xl bg-white px-3 py-2 text-sm shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5"
                required
                disabled={templateSets.length === 0}
              >
                {templateSets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {typeof s.templates?.length === "number"
                      ? ` (${s.templates.length} Vorlage${s.templates.length === 1 ? "" : "n"})`
                      : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Gelato-Profil</span>
              <select
                name="gelato_profile"
                className="mt-1 w-full rounded-xl bg-white px-3 py-2 text-sm shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5"
                defaultValue={GELATO_PRESETS[0]!.value}
                required
              >
                {GELATO_PRESETS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Bilder (max. 35)</span>
            <input
              type="file"
              name="images"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-violet-700"
              required
            />
          </label>

          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={busy || templateSets.length === 0 || !mockupSetId}
          >
            {busy ? (
              <>
                <Loader2 className="animate-spin" size={16} /> Starten…
              </>
            ) : (
              <>
                <Rocket size={16} /> Pipeline starten
              </>
            )}
          </Button>
        </form>
      ) : null}

      <AnimatePresence mode="wait">
        {jobId && job ? (
          <motion.div
            key="automation-run"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <RunDashboard
              job={job}
              lastPolledAt={lastPolledAt}
              onNewJob={handleNewJob}
            />
          </motion.div>
        ) : jobId && !job ? (
          <motion.div
            key="automation-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white p-12 text-slate-600 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5"
          >
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            Job wird geladen…
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AppPage>
  );
};
