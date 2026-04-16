import { Check, ChevronDown, ImagePlus, Loader2 } from "lucide-react";
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
import { cn } from "../../lib/cn";
import { getErrorMessage } from "../../lib/error";
import { toast } from "../../lib/toast";
import { useAppStore } from "../../store/appStore";
import { IntegrationMissingCallout } from "../ui/IntegrationMissingCallout";

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

const ALLOWED_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);

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
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => {
      const row = prev.find((r) => r.id === id);
      if (row?.previewUrl) URL.revokeObjectURL(row.previewUrl);
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const picked: File[] = [];
      for (const f of files) {
        const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
        if (ALLOWED_EXT.has(ext)) picked.push(f);
      }
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
        const tagLine =
          result.tags?.length > 0 ? `\n\n${result.tags.join(" ")}` : "";
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

  const handlePublishAll = useCallback(async () => {
    if (!boardId.trim()) {
      toast.error("Bitte ein Pinterest-Board wählen.");
      return;
    }
    const targets = rows.filter(
      (r) =>
        (r.rowStatus === "draft" || r.rowStatus === "error") && r.publicUrl,
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
        const msg =
          e instanceof ApiError ? e.getDetail() : getErrorMessage(e);
        updateRow(row.id, { rowStatus: "error", errorMessage: msg });
      }
    }
    setQueueRunning(false);
    toast.success("Warteschlange abgeschlossen.");
  }, [boardId, rows, updateRow]);

  const canPublish =
    Boolean(boardId.trim()) &&
    rows.some(
      (r) =>
        (r.rowStatus === "draft" || r.rowStatus === "error") && r.publicUrl,
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Verbreiten</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Mockups nach R2 laden, KI-Captions erzeugen und einzeln zu Pinterest posten.
          Pinterest zuerst unter{" "}
          <span className="font-medium text-slate-600">Integrationen → Pinterest</span>{" "}
          verknüpfen.
        </p>
      </div>

      {!integrationFlagsLoading && !pinterestConnected ? (
        <IntegrationMissingCallout
          title="Pinterest ist nicht verbunden"
          description="Verknüpfe dein Pinterest-Konto unter Integrationen, um Boards zu laden und Pins zu veröffentlichen."
          actionLabel="Pinterest einrichten"
          onSetup={() => goToIntegration("pinterest")}
        />
      ) : null}

      <section
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        aria-labelledby={dropId}
      >
        <h2 id={dropId} className="text-sm font-semibold text-slate-800">
          Setup
        </h2>
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
              "flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/40",
            )}
          >
            <ImagePlus className="mb-2 text-slate-400" size={32} strokeWidth={1.5} />
            <span className="text-sm font-medium text-slate-700">
              Bilder hierher ziehen
            </span>
            <span className="mt-1 text-xs text-slate-500">
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
            <label htmlFor="marketing-board" className="text-xs font-medium text-slate-600">
              Pinterest-Board
            </label>
            <div className="relative">
              <select
                id="marketing-board"
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                disabled={!boardsLoaded || boards.length === 0}
                className={cn(
                  "w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
                  (!boardsLoaded || boards.length === 0) && "opacity-60",
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
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
            </div>
            {!boardsLoaded && (
              <p className="text-xs text-slate-500">Boards werden geladen…</p>
            )}
          </div>
        </div>
      </section>

      {rows.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-slate-800">Beiträge</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500">
                  <th className="px-3 py-2 font-medium sm:px-4">Vorschau</th>
                  <th className="px-3 py-2 font-medium sm:px-4">Titel</th>
                  <th className="px-3 py-2 font-medium sm:px-4">Caption</th>
                  <th className="px-3 py-2 font-medium sm:px-4">Etsy-URL</th>
                  <th className="px-3 py-2 font-medium sm:px-4">Status</th>
                  <th className="px-3 py-2 font-medium sm:px-4">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 align-top">
                    <td className="px-3 py-3 sm:px-4">
                      <img
                        src={row.previewUrl}
                        alt=""
                        className="h-16 w-16 rounded-md object-cover ring-1 ring-slate-200"
                      />
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) =>
                          updateRow(row.id, { title: e.target.value })
                        }
                        className="w-full min-w-[8rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        disabled={row.rowStatus === "loading"}
                      />
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <textarea
                        value={row.caption}
                        onChange={(e) =>
                          updateRow(row.id, { caption: e.target.value })
                        }
                        rows={3}
                        className="w-full min-w-[12rem] resize-y rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        disabled={row.rowStatus === "loading"}
                      />
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <input
                        type="url"
                        value={row.destinationUrl}
                        onChange={(e) =>
                          updateRow(row.id, { destinationUrl: e.target.value })
                        }
                        placeholder="https://…"
                        className="w-full min-w-[10rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        disabled={row.rowStatus === "loading"}
                      />
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                          row.rowStatus === "draft" && "bg-slate-100 text-slate-700",
                          row.rowStatus === "loading" &&
                            "bg-indigo-50 text-indigo-700",
                          row.rowStatus === "success" &&
                            "bg-emerald-50 text-emerald-800",
                          row.rowStatus === "error" && "bg-red-50 text-red-800",
                        )}
                      >
                        {row.rowStatus === "loading" && (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        )}
                        {row.rowStatus === "success" && (
                          <Check className="size-3.5" aria-hidden />
                        )}
                        {statusLabel[row.rowStatus]}
                      </span>
                      {row.errorMessage && (
                        <p className="mt-1 max-w-[14rem] text-xs text-red-600">
                          {row.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => void handleAiCaption(row.id)}
                          disabled={
                            row.rowStatus === "loading" || queueRunning
                          }
                          className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-800 transition-colors hover:bg-indigo-100 disabled:opacity-50"
                        >
                          KI-Caption
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="text-xs text-slate-500 underline hover:text-slate-800"
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

          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-slate-500">
              Veröffentlichung nacheinander — bei Fehler geht es mit der nächsten Zeile weiter.
            </p>
            <button
              type="button"
              onClick={() => void handlePublishAll()}
              disabled={queueRunning || !canPublish}
              className={cn(
                "inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {queueRunning ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Warteschlange…
                </>
              ) : (
                "Alle zu Pinterest veröffentlichen"
              )}
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
