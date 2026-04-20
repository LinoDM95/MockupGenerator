import {
  ArrowDownToLine,
  Check,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Megaphone,
  Send,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
} from "react";

import { generateListing } from "../../api/ai";
import { ApiError } from "../../api/client";
import { gelatoUploadTempImage } from "../../api/gelato";
import {
  getPinterestBoards,
  publishSingleSocialPost,
  type PinterestBoard,
} from "../../api/marketing";
import { useIntegrationFlags } from "../../hooks/useIntegrationFlags";
import { cn } from "../../lib/ui/cn";
import { getErrorMessage } from "../../lib/common/error";
import {
  filterRasterImageFiles,
  MARKETING_ALLOWED_EXT,
} from "../../lib/generator/imageUploadAccept";
import { toast } from "../../lib/ui/toast";
import { useAppStore } from "../../store/appStore";
import { Button } from "../ui/primitives/Button";
import { Card } from "../ui/primitives/Card";
import { AppPageSectionHeader } from "../ui/layout/AppPageSectionHeader";
import { AppSubNavPageLayout } from "../ui/layout/AppSubNavPageLayout";
import { Input } from "../ui/primitives/Input";
import { Select } from "../ui/primitives/Select";
import { IntegrationMissingCallout } from "../ui/patterns/IntegrationMissingCallout";

const MARKETING_WEBHOOK_STORAGE_KEY = "ce_marketing_webhook_url";

type RowStatus = "draft" | "loading" | "success" | "error";

type MarketingRow = {
  id: string;
  file: File;
  previewUrl: string;
  publicUrl: string | null;
  title: string;
  caption: string;
  destinationUrl: string;
  rowStatus: RowStatus;
  errorMessage: string;
};

const nextRowId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const statusLabel: Record<RowStatus, string> = {
  draft: "Entwurf",
  loading: "Lädt…",
  success: "OK",
  error: "Fehler",
};

export const MarketingDashboard = () => {
  const goToIntegration = useAppStore((s) => s.goToIntegration);
  const { pinterest: pinterestConnected, loading: integrationFlagsLoading } =
    useIntegrationFlags();
  const dropId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<MarketingRow[]>([]);
  const [boards, setBoards] = useState<PinterestBoard[]>([]);
  const [boardId, setBoardId] = useState("");
  const [boardsLoaded, setBoardsLoaded] = useState(false);
  const [queueRunning, setQueueRunning] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(() => {
    try {
      return localStorage.getItem(MARKETING_WEBHOOK_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await getPinterestBoards();
        if (!cancelled) {
          setBoards(res.boards);
          setBoardsLoaded(true);
        }
      } catch (e) {
        if (!cancelled) {
          setBoardsLoaded(true);
          toast.error(`Boards konnten nicht geladen werden: ${getErrorMessage(e)}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRow = useCallback((id: string, patch: Partial<MarketingRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => {
      const row = prev.find((r) => r.id === id);
      if (row?.previewUrl) URL.revokeObjectURL(row.previewUrl);
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  const handleSaveWebhook = useCallback(() => {
    try {
      localStorage.setItem(MARKETING_WEBHOOK_STORAGE_KEY, webhookUrl.trim());
      toast.success("Webhook-URL im Browser gespeichert.");
    } catch {
      toast.error("Speichern nicht möglich.");
    }
  }, [webhookUrl]);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const picked = filterRasterImageFiles(files, {
        allowedExt: MARKETING_ALLOWED_EXT,
      });
      if (picked.length === 0) {
        toast.error("Keine gültigen Bilddateien (JPG, PNG, WebP, GIF).");
        return;
      }

      const newRows: MarketingRow[] = picked.map((file) => ({
        id: nextRowId(),
        file,
        previewUrl: URL.createObjectURL(file),
        publicUrl: null,
        title: file.name.replace(/\.[^/.]+$/, ""),
        caption: "",
        destinationUrl: "",
        rowStatus: "loading" as const,
        errorMessage: "",
      }));

      setRows((prev) => [...prev, ...newRows]);

      for (const row of newRows) {
        try {
          const up = await gelatoUploadTempImage(row.file);
          updateRow(row.id, { publicUrl: up.public_url, rowStatus: "draft" });
        } catch (e) {
          updateRow(row.id, {
            rowStatus: "error",
            errorMessage: getErrorMessage(e),
          });
        }
      }
    },
    [updateRow],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files?.length) {
        void uploadFiles(Array.from(e.dataTransfer.files));
      }
    },
    [uploadFiles],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (list?.length) void uploadFiles(Array.from(list));
      e.target.value = "";
    },
    [uploadFiles],
  );

  const handleAiCaption = useCallback(
    async (id: string) => {
      const row = rows.find((r) => r.id === id);
      if (!row) return;
      updateRow(id, { rowStatus: "loading", errorMessage: "" });
      try {
        const result = await generateListing(row.file, "", "social_caption");
        const title = result.titles[0]?.trim() ?? "";
        const tagLine = result.tags?.length > 0 ? `\n\n${result.tags.join(" ")}` : "";
        const caption = `${result.description || ""}${tagLine}`.trim();
        updateRow(id, {
          title: title || row.title,
          caption,
          rowStatus: "draft",
          errorMessage: "",
        });
        toast.success("KI-Caption erzeugt.");
      } catch (e) {
        updateRow(id, {
          rowStatus: "error",
          errorMessage: getErrorMessage(e),
        });
        toast.error(`KI: ${getErrorMessage(e)}`);
      }
    },
    [rows, updateRow],
  );

  const handlePublishOne = useCallback(
    async (id: string) => {
      if (!boardId.trim()) {
        toast.error("Bitte ein Pinterest-Board wählen.");
        return;
      }
      const row = rows.find((r) => r.id === id);
      if (!row?.publicUrl) return;
      if (!row.title.trim() || !row.destinationUrl.trim()) {
        toast.error("Titel und Etsy-Ziel-URL sind erforderlich.");
        return;
      }
      updateRow(id, { rowStatus: "loading", errorMessage: "" });
      try {
        await publishSingleSocialPost({
          image_url: row.publicUrl,
          title: row.title.trim(),
          caption: row.caption,
          destination_url: row.destinationUrl.trim(),
          platform: "pinterest",
          board_id: boardId.trim(),
        });
        updateRow(id, { rowStatus: "success", errorMessage: "" });
        toast.success("Zu Pinterest veröffentlicht.");
      } catch (e) {
        const msg = e instanceof ApiError ? e.getDetail() : getErrorMessage(e);
        updateRow(id, { rowStatus: "error", errorMessage: msg });
        toast.error(msg);
      }
    },
    [boardId, rows, updateRow],
  );

  const handlePublishAll = useCallback(async () => {
    if (!boardId.trim()) {
      toast.error("Bitte ein Pinterest-Board wählen.");
      return;
    }
    const targets = rows.filter(
      (r) => (r.rowStatus === "draft" || r.rowStatus === "error") && r.publicUrl,
    );
    if (targets.length === 0) {
      toast.error("Keine Zeilen zum Veröffentlichen (Entwurf/Fehler mit gültigem Upload).");
      return;
    }

    setQueueRunning(true);
    for (const row of targets) {
      if (!row.publicUrl) continue;
      if (!row.title.trim() || !row.destinationUrl.trim()) {
        updateRow(row.id, {
          rowStatus: "error",
          errorMessage: "Titel und Etsy-Ziel-URL sind erforderlich.",
        });
        continue;
      }

      updateRow(row.id, { rowStatus: "loading", errorMessage: "" });
      try {
        await publishSingleSocialPost({
          image_url: row.publicUrl,
          title: row.title.trim(),
          caption: row.caption,
          destination_url: row.destinationUrl.trim(),
          platform: "pinterest",
          board_id: boardId.trim(),
        });
        updateRow(row.id, { rowStatus: "success", errorMessage: "" });
      } catch (e) {
        const msg = e instanceof ApiError ? e.getDetail() : getErrorMessage(e);
        updateRow(row.id, { rowStatus: "error", errorMessage: msg });
      }
    }
    setQueueRunning(false);
    toast.success("Warteschlange abgeschlossen.");
  }, [boardId, rows, updateRow]);

  const canPublish =
    Boolean(boardId.trim()) &&
    rows.some((r) => (r.rowStatus === "draft" || r.rowStatus === "error") && r.publicUrl);

  const pendingQueueCount = rows.filter(
    (r) => r.rowStatus === "draft" || r.rowStatus === "loading" || r.rowStatus === "error",
  ).length;

  return (
    <AppSubNavPageLayout
      title="Verbreiten & Marketing"
      description={
        "Mockups nach R2 laden, optional per Webhook an Make.com anbinden, KI-Captions erzeugen und zu Pinterest posten. Pinterest zuerst unter Integrationen → Pinterest verknüpfen."
      }
    >
      <div className="w-full min-w-0 space-y-8 pb-12">
        <AppPageSectionHeader
          icon={Megaphone}
          title="Publikation & Pinterest"
          description="Upload, Board, Warteschlange und Beiträge — Webhook und Make-Blueprint im linken Bereich."
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
          {!integrationFlagsLoading && !pinterestConnected ? (
            <IntegrationMissingCallout
              title="Pinterest ist nicht verbunden"
              description="Verknüpfe dein Pinterest-Konto unter Integrationen, um Boards zu laden und Pins zu veröffentlichen."
              actionLabel="Pinterest einrichten"
              onSetup={() => goToIntegration("pinterest")}
            />
          ) : null}

          <Card variant="accent" padding="lg">
            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Webhook &amp; Automation
              </p>
              <h3 className="mt-1 text-base font-bold tracking-tight text-slate-900">Anbindung</h3>
              <p className="mt-0.5 text-xs font-medium text-slate-500">Make.com, n8n oder Zapier</p>
            </div>

            <div className="space-y-5">
              <Input
                label="Webhook URL"
                name="marketing_webhook"
                placeholder="https://hook.eu1.make.com/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                autoComplete="off"
              />
              <div className="flex justify-end">
                <Button type="button" size="sm" onClick={handleSaveWebhook}>
                  Speichern
                </Button>
              </div>
            </div>

            <div className="mt-8 rounded-xl bg-slate-50 px-4 py-4 ring-1 ring-inset ring-slate-900/5">
              <h3 className="text-sm font-bold tracking-tight text-slate-900">1-Klick Pinterest Setup</h3>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                Lade die Vorlage (JSON) herunter, importiere sie in Make, verbinde Pinterest und trage die
                Webhook-URL von oben ein.
              </p>
              <a
                href="/marketing-make-blueprint.json"
                download="creative-engine-make-blueprint.json"
                className={cn(
                  "mt-4 inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold tracking-wide text-slate-700 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 transition-all duration-200 ease-out hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 active:scale-[0.97]",
                )}
              >
                <ArrowDownToLine size={14} aria-hidden />
                Blueprint (.json) laden
              </a>
            </div>
          </Card>

          <Card padding="md">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Upload &amp; Board
            </p>
            <h3 id={dropId} className="mt-1 text-base font-bold tracking-tight text-slate-900">
              Bilder &amp; Pinterest
            </h3>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Dateien hierher ziehen und Ziel-Board wählen — Grundlage für die Tabelle unten.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center ring-1 ring-inset ring-slate-900/5 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50/80",
                )}
              >
                <ImagePlus className="mb-2 text-slate-400" size={32} strokeWidth={1.5} aria-hidden />
                <span className="text-sm font-semibold text-slate-700">Bilder hierher ziehen</span>
                <span className="mt-1 text-xs font-medium text-slate-500">
                  oder klicken — mehrere Dateien möglich
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="sr-only"
                  aria-label="Bilder auswählen"
                  onChange={handleFileInput}
                />
              </div>

              <div className="flex flex-col justify-center gap-2">
                <Select
                  id="marketing-board"
                  label="Pinterest-Board"
                  value={boardId}
                  onChange={(e) => setBoardId(e.target.value)}
                  disabled={!boardsLoaded || boards.length === 0}
                  className={cn(
                    (!boardsLoaded || boards.length === 0) && "cursor-not-allowed opacity-50",
                  )}
                >
                  <option value="">
                    {boardsLoaded && boards.length === 0
                      ? "Keine Boards — Pinterest verbinden"
                      : "Board wählen…"}
                  </option>
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
                {!boardsLoaded ? (
                  <p className="text-xs font-medium text-slate-500">Boards werden geladen…</p>
                ) : null}
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card padding="md" className="h-full">
            <div className="mb-6 flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Übersicht
                </p>
                <h3 className="mt-1 text-base font-bold tracking-tight text-slate-900">Warteschlange</h3>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-900/5">
                {pendingQueueCount} anstehend
              </span>
            </div>

            {rows.length === 0 ? (
              <p className="text-sm font-medium text-slate-500">
                Noch keine Beiträge — Bilder links hinzufügen, dann erscheinen sie hier.
              </p>
            ) : (
              <div className="max-h-[min(420px,50vh)] space-y-3 overflow-y-auto pr-1">
                {rows.map((job, i) => {
                  const done = job.rowStatus === "success";
                  const canSend =
                    !done &&
                    job.publicUrl &&
                    !queueRunning &&
                    job.rowStatus !== "loading";
                  return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group flex items-center justify-between gap-2 rounded-xl bg-slate-50/50 p-3 ring-1 ring-inset ring-slate-900/5 transition-colors hover:bg-slate-100/70"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                            done
                              ? "bg-emerald-50 text-emerald-600 ring-emerald-500/20"
                              : "bg-white text-slate-400 ring-slate-900/10",
                          )}
                        >
                          {done ? (
                            <CheckCircle2 size={14} strokeWidth={2.5} aria-hidden />
                          ) : (
                            <Megaphone size={14} strokeWidth={2} aria-hidden />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-700">{job.title}</p>
                          <p className="text-xs font-medium text-slate-400">
                            {statusLabel[job.rowStatus]}
                            {job.rowStatus === "loading" ? " …" : ""}
                          </p>
                        </div>
                      </div>
                      {canSend ? (
                        <button
                          type="button"
                          className="hidden shrink-0 rounded-lg bg-white p-1.5 text-slate-400 ring-1 ring-slate-900/5 hover:text-indigo-600 group-hover:block"
                          title="Jetzt zu Pinterest posten"
                          onClick={() => void handlePublishOne(job.id)}
                        >
                          <Send size={14} strokeWidth={2} aria-hidden />
                        </button>
                      ) : null}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {rows.length > 0 && (
        <Card padding="none" className="overflow-hidden">
          <div className="px-5 py-4 sm:px-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Tabelle
            </p>
            <h3 className="mt-1 text-base font-bold tracking-tight text-slate-900">Beiträge bearbeiten</h3>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Titel, Caption und Etsy-URL pro Zeile — dann veröffentlichen.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-bold sm:px-4">Vorschau</th>
                  <th className="px-3 py-2 font-bold sm:px-4">Titel</th>
                  <th className="px-3 py-2 font-bold sm:px-4">Caption</th>
                  <th className="px-3 py-2 font-bold sm:px-4">Etsy-URL</th>
                  <th className="px-3 py-2 font-bold sm:px-4">Status</th>
                  <th className="px-3 py-2 font-bold sm:px-4">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 align-top">
                    <td className="px-3 py-3 sm:px-4">
                      <img
                        src={row.previewUrl}
                        alt=""
                        className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-900/10"
                      />
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) => updateRow(row.id, { title: e.target.value })}
                        className="w-full min-w-[8rem] rounded-xl bg-white px-2 py-1.5 text-sm font-medium text-slate-900 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                        disabled={row.rowStatus === "loading"}
                      />
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <textarea
                        value={row.caption}
                        onChange={(e) => updateRow(row.id, { caption: e.target.value })}
                        rows={3}
                        className="w-full min-w-[12rem] resize-y rounded-xl bg-white px-2 py-1.5 text-sm font-medium text-slate-900 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                        disabled={row.rowStatus === "loading"}
                      />
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <input
                        type="url"
                        value={row.destinationUrl}
                        onChange={(e) => updateRow(row.id, { destinationUrl: e.target.value })}
                        placeholder="https://…"
                        className="w-full min-w-[10rem] rounded-xl bg-white px-2 py-1.5 text-sm font-medium text-slate-900 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                        disabled={row.rowStatus === "loading"}
                      />
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
                          row.rowStatus === "draft" && "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-900/5",
                          row.rowStatus === "loading" && "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-500/15",
                          row.rowStatus === "success" &&
                            "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-500/20",
                          row.rowStatus === "error" && "bg-red-50 text-red-800 ring-1 ring-inset ring-red-500/15",
                        )}
                      >
                        {row.rowStatus === "loading" && (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        )}
                        {row.rowStatus === "success" && <Check className="size-3.5" aria-hidden />}
                        {statusLabel[row.rowStatus]}
                      </span>
                      {row.errorMessage ? (
                        <p className="mt-1 max-w-[14rem] text-xs font-medium text-red-600">
                          {row.errorMessage}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => void handleAiCaption(row.id)}
                          disabled={row.rowStatus === "loading" || queueRunning}
                          className="rounded-xl bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-indigo-500/20 transition-colors hover:bg-indigo-50 disabled:opacity-50"
                        >
                          KI-Caption
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="text-left text-xs font-medium text-slate-500 underline hover:text-slate-800"
                        >
                          Entfernen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs font-medium text-slate-500">
              Veröffentlichung nacheinander — bei Fehler geht es mit der nächsten Zeile weiter.
            </p>
            <Button
              type="button"
              onClick={() => void handlePublishAll()}
              disabled={queueRunning || !canPublish}
            >
              {queueRunning ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Warteschlange…
                </>
              ) : (
                "Alle zu Pinterest veröffentlichen"
              )}
            </Button>
          </div>
        </Card>
      )}
      </div>
    </AppSubNavPageLayout>
  );
};
