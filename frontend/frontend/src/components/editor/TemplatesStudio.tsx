import {
  Copy,
  DownloadCloud,
  Folder,
  FolderPlus,
  LayoutTemplate,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  createTemplateSet,
  createTemplateWithUpload,
  deleteTemplate,
  deleteTemplateSet,
  exportSetJson,
  importSetJson,
  patchTemplate,
  patchTemplateSet,
} from "../../api/sets";
import { compressImage, dataUrlToBlob, loadImage } from "../../lib/canvas/image";
import { cn } from "../../lib/ui/cn";
import { newClientElementId } from "../../lib/editor/elementId";
import { getErrorMessage } from "../../lib/common/error";
import { normalizeTemplateForEditor } from "../../lib/editor/normalizeTemplateForEditor";
import { sanitizeFileName } from "../../lib/common/sanitize";
import { toast } from "../../lib/ui/toast";
import { useLoadTemplateSets } from "../../hooks/useLoadTemplateSets";
import type { Template, TemplateElement } from "../../types/mockup";
import { useAppStore } from "../../store/appStore";
import { TemplateEditor } from "./TemplateEditor";
import { Button } from "../ui/primitives/Button";
import { Card } from "../ui/primitives/Card";
import { LinearLoadingBar } from "../ui/overlay/LinearLoadingBar";

const accentDotForSetId = (id: string): string => {
  const palette = ["#f59e0b", "#ec4899", "#0ea5e9", "#10b981", "#8b5cf6", "#6366f1"];
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return palette[n % palette.length]!;
};

export const TemplatesStudio = () => {
  const templateSets = useAppStore((s) => s.templateSets);
  const editingSetId = useAppStore((s) => s.editingSetId);
  const setEditingSetId = useAppStore((s) => s.setEditingSetId);
  const editingTemplate = useAppStore((s) => s.editingTemplate);
  const setEditingTemplate = useAppStore((s) => s.setEditingTemplate);
  const setSelectedElementId = useAppStore((s) => s.setSelectedElementId);
  const openPrompt = useAppStore((s) => s.openPrompt);
  const openConfirm = useAppStore((s) => s.openConfirm);

  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const { reload: reloadSetsRaw } = useLoadTemplateSets();

  const reloadSets = async () => {
    setProgressMessage("Vorlagen werden geladen…");
    try {
      await reloadSetsRaw();
    } finally {
      setProgressMessage(null);
    }
  };

  const createNewSet = async () => {
    const name = await openPrompt("Name des neuen Vorlagen-Sets:", "Neues Set");
    if (!name) return;
    try {
      const created = await createTemplateSet(name.trim());
      await reloadSets();
      setEditingSetId(created.id);
    } catch (e) {
      toast.error(`Fehler: ${getErrorMessage(e)}`);
    }
  };

  const handleDeleteSet = async (setId: string) => {
    const ok = await openConfirm("Dieses Set und alle Vorlagen wirklich löschen?");
    if (!ok) return;
    try {
      await deleteTemplateSet(setId);
      await reloadSets();
      if (editingSetId === setId) setEditingSetId(null);
    } catch (e) {
      toast.error(`Fehler: ${getErrorMessage(e)}`);
    }
  };

  const handleRenameSet = async (setId: string, current: string) => {
    const name = await openPrompt("Set umbenennen:", current);
    if (!name?.trim()) return;
    try {
      await patchTemplateSet(setId, name.trim());
      await reloadSets();
    } catch (e) {
      toast.error(`Fehler: ${getErrorMessage(e)}`);
    }
  };

  const handleExportSet = async (setId: string) => {
    try {
      const data = await exportSetJson(setId);
      const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data))}`;
      const a = document.createElement("a");
      a.href = dataStr;
      const setName = templateSets.find((s) => s.id === setId)?.name ?? "set";
      a.download = `${sanitizeFileName(setName)}.mockup`;
      a.click();
    } catch (e) {
      toast.error(`Export fehlgeschlagen: ${getErrorMessage(e)}`);
    }
  };

  const handleImportSet = async (file: File | null) => {
    if (!file) return;
    setProgressMessage("Import-Datei wird gelesen…");
    let text: string;
    try {
      text = await file.text();
    } catch {
      setProgressMessage(null);
      toast.error("Import-Datei konnte nicht gelesen werden.");
      return;
    }
    try {
      setProgressMessage("Set wird importiert…");
      const body = JSON.parse(text) as unknown;
      await importSetJson(body);
      setProgressMessage("Vorlagen werden aktualisiert…");
      await reloadSetsRaw();
      toast.success("Set importiert.");
    } catch (e) {
      let msg = "Import fehlgeschlagen.";
      if (e instanceof SyntaxError) {
        msg = "Import fehlgeschlagen: Datei ist kein gültiges JSON.";
      } else {
        msg = `Import: ${getErrorMessage(e)}`;
      }
      toast.error(msg);
    } finally {
      setProgressMessage(null);
    }
  };

  const startNewTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editingSetId) return;
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        setProgressMessage("Bild wird gelesen und optimiert…");
        try {
          const dataUrl = await compressImage(reader.result as string);
          setProgressMessage("Vorschau wird erstellt…");
          const img = await loadImage(dataUrl);
          const initialElement: TemplateElement = {
            id: newClientElementId(),
            type: "placeholder",
            name: "Motiv Platzhalter",
            x: Math.round(img.width * 0.25),
            y: Math.round(img.height * 0.2),
            w: Math.round(img.width * 0.5),
            h: Math.round(img.height * 0.6),
            rotation: 0,
            shadowEnabled: false,
            shadowColor: "rgba(0,0,0,0.5)",
            shadowBlur: 20,
            shadowOffsetX: 10,
            shadowOffsetY: 10,
            textCurve: 0,
          };
          const blob = await dataUrlToBlob(dataUrl);
          setProgressMessage("Vorlage wird hochgeladen…");
          await createTemplateWithUpload(editingSetId, blob, file.name || "template.jpg", {
            name: "Neue Vorlage",
            elements: [initialElement],
          });
          setProgressMessage("Vorlagen werden aktualisiert…");
          await reloadSetsRaw();
        } catch (err) {
          console.error(err);
          toast.error(`Vorlage konnte nicht angelegt werden: ${getErrorMessage(err)}`);
        } finally {
          setProgressMessage(null);
        }
      })();
    };
    reader.readAsDataURL(file);
  };

  const editTemplate = (tpl: Template) => {
    const migrated = normalizeTemplateForEditor(tpl);
    setEditingTemplate(migrated);
    setSelectedElementId(migrated.elements[0]?.id ?? null);
  };

  const handleDeleteTemplate = async (tplId: string) => {
    const ok = await openConfirm("Diese Vorlage wirklich löschen?");
    if (!ok) return;
    try {
      await deleteTemplate(tplId);
      await reloadSets();
    } catch (e) {
      toast.error(`Fehler: ${getErrorMessage(e)}`);
    }
  };

  const handleRenameTemplate = async (tplId: string, current: string) => {
    const name = await openPrompt("Vorlage umbenennen:", current);
    if (!name?.trim()) return;
    try {
      await patchTemplate(tplId, { name: name.trim() });
      await reloadSets();
    } catch (e) {
      toast.error(`Fehler: ${getErrorMessage(e)}`);
    }
  };

  const duplicateSetById = async (setId: string) => {
    const set = templateSets.find((s) => s.id === setId);
    if (!set) return;
    const name = await openPrompt("Name der Kopie:", `${set.name} (Kopie)`);
    if (!name?.trim()) return;
    setProgressMessage("Set wird für die Kopie exportiert…");
    try {
      const exported = await exportSetJson(setId);
      setProgressMessage("Neues Set wird angelegt…");
      const created = await createTemplateSet(name.trim());
      const total = exported.templates.length;
      for (let i = 0; i < total; i++) {
        const t = exported.templates[i];
        setProgressMessage(`Dupliziere Vorlage ${i + 1} von ${total}…`);
        const res = await fetch(t.bgImage);
        if (!res.ok) throw new Error(`Bild ${t.name}`);
        const blob = await res.blob();
        await createTemplateWithUpload(created.id, blob, "background.jpg", {
          name: t.name,
          elements: t.elements,
        });
      }
      setProgressMessage("Vorlagen werden aktualisiert…");
      await reloadSetsRaw();
      setEditingSetId(created.id);
      toast.success(`Set „${name.trim()}" dupliziert.`);
    } catch (err) {
      toast.error(`Duplizieren fehlgeschlagen: ${getErrorMessage(err)}`);
    } finally {
      setProgressMessage(null);
    }
  };

  useEffect(() => {
    if (templateSets.length === 0) {
      setEditingSetId(null);
      return;
    }
    const valid = editingSetId != null && templateSets.some((s) => s.id === editingSetId);
    if (!valid) {
      setEditingSetId(templateSets[0]!.id);
    }
  }, [templateSets, editingSetId, setEditingSetId]);

  const handleCloseTemplateEditor = () => {
    setEditingTemplate(null);
    setSelectedElementId(null);
  };

  if (editingTemplate) {
    return (
      <div className="w-full min-w-0">
        <h1 className="sr-only">Vorlage bearbeiten</h1>
        <TemplateEditor onClose={handleCloseTemplateEditor} onSaved={reloadSets} />
      </div>
    );
  }

  const currentSet =
    editingSetId != null ? templateSets.find((s) => s.id === editingSetId) : undefined;

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-col">
      {progressMessage ? <LinearLoadingBar message={progressMessage} /> : null}

      <div className="grid min-h-[min(820px,calc(100dvh-7rem))] gap-4 lg:grid-cols-[260px_1fr] lg:items-stretch">
        <Card
          variant="bordered"
          padding="none"
          className="flex min-h-0 flex-col overflow-hidden shadow-[var(--pf-shadow-sm)] ring-1 ring-[color:var(--pf-border)]"
          aria-label="Vorlagen-Sets"
        >
          <div className="flex items-center justify-between border-b border-[color:var(--pf-border)] px-3.5 py-3">
            <span className="text-[13px] font-semibold text-[color:var(--pf-fg)]">Vorlagen-Sets</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 w-10 shrink-0 p-0 text-[color:var(--pf-fg-muted)] hover:text-[color:var(--pf-fg)]"
              onClick={() => void createNewSet()}
              aria-label="Neues Set anlegen"
            >
              <FolderPlus size={22} strokeWidth={2} aria-hidden />
            </Button>
          </div>

          <div className="min-h-[12rem] flex-1 overflow-y-auto p-1.5">
            {templateSets.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm font-medium text-[color:var(--pf-fg-muted)]">
                Noch keine Sets — nutze „+“ oben oder importiere unten eine .mockup-Datei.
              </p>
            ) : (
              templateSets.map((set) => {
                const selected = set.id === editingSetId;
                return (
                  <div
                    key={set.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "relative mb-0.5 cursor-pointer rounded-md border px-2.5 py-2.5 pr-8 transition-colors",
                      selected
                        ? "border-[color:var(--pf-accent-border)] bg-[color:var(--pf-accent-bg)]"
                        : "border-transparent hover:bg-[color:var(--pf-bg-muted)]",
                    )}
                    onClick={() => setEditingSetId(set.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setEditingSetId(set.id);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 shrink-0 rounded-sm"
                        style={{ background: accentDotForSetId(set.id) }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[color:var(--pf-fg)]">
                        {set.name}
                      </span>
                    </div>
                    <p className="mt-0.5 pl-4 text-[11px] font-medium text-[color:var(--pf-fg-muted)]">
                      {set.templates.length} Vorlagen
                    </p>
                    <div
                      className="absolute right-1 top-1 flex items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="rounded-md p-1 text-[color:var(--pf-fg-subtle)] transition-colors hover:bg-[color:var(--pf-bg-elevated)] hover:text-[color:var(--pf-accent)]"
                        title="Umbenennen"
                        aria-label={`Set ${set.name} umbenennen`}
                        onClick={() => void handleRenameSet(set.id, set.name)}
                      >
                        <Pencil size={13} strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1 text-[color:var(--pf-fg-subtle)] transition-colors hover:bg-[color:var(--pf-danger-bg)] hover:text-[color:var(--pf-danger)]"
                        title="Set löschen"
                        aria-label={`Set ${set.name} löschen`}
                        onClick={() => void handleDeleteSet(set.id)}
                      >
                        <Trash2 size={13} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex gap-1.5 border-t border-[color:var(--pf-border)] p-2.5">
            <label
              className={cn(
                "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[color:var(--pf-border)] bg-[color:var(--pf-bg)] px-2 py-2 text-center text-[11px] font-semibold text-[color:var(--pf-fg)] shadow-[var(--pf-shadow-sm)] transition-colors hover:bg-[color:var(--pf-bg-muted)]",
              )}
            >
              <UploadCloud size={12} strokeWidth={1.75} aria-hidden />
              Import
              <input
                type="file"
                className="hidden"
                accept=".mockup,.json,application/json"
                onChange={(e) => void handleImportSet(e.target.files?.[0] ?? null)}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 gap-1 px-2 text-[11px] font-semibold"
              disabled={!editingSetId}
              onClick={() => editingSetId && void handleExportSet(editingSetId)}
            >
              <DownloadCloud size={12} strokeWidth={1.75} aria-hidden />
              Export
            </Button>
          </div>
        </Card>

        <Card
          variant="bordered"
          padding="none"
          className="flex min-h-0 flex-col overflow-hidden shadow-[var(--pf-shadow-sm)] ring-1 ring-[color:var(--pf-border)]"
          aria-label="Vorlagen im ausgewählten Set"
        >
          {currentSet ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--pf-border)] px-4 py-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    className="group block max-w-full text-left"
                    onClick={() => void handleRenameSet(currentSet.id, currentSet.name)}
                  >
                    <h2 className="truncate text-[15px] font-semibold tracking-tight text-[color:var(--pf-fg)] decoration-[color:var(--pf-border-strong)] group-hover:underline">
                      {currentSet.name}
                    </h2>
                  </button>
                  <p className="mt-0.5 text-xs font-medium text-[color:var(--pf-fg-muted)]">
                    {currentSet.templates.length} Vorlagen
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-semibold tracking-normal"
                    onClick={() => void duplicateSetById(currentSet.id)}
                  >
                    <Copy size={13} strokeWidth={1.75} aria-hidden />
                    Duplizieren
                  </Button>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[color:var(--pf-accent)] px-3 py-2 text-xs font-semibold text-[color:var(--pf-accent-fg)] shadow-sm transition-opacity hover:opacity-95">
                    <Plus size={13} strokeWidth={2} aria-hidden />
                    Neue Vorlage
                    <input type="file" className="hidden" accept="image/*" onChange={startNewTemplate} />
                  </label>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {currentSet.templates.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[color:var(--pf-border)] bg-[color:var(--pf-bg-subtle)] py-16 text-center ring-1 ring-inset ring-[color:var(--pf-border-subtle)]">
                    <LayoutTemplate
                      className="mx-auto mb-3 text-[color:var(--pf-fg-faint)]"
                      size={48}
                      strokeWidth={1}
                      aria-hidden
                    />
                    <p className="font-semibold text-[color:var(--pf-fg)]">Dieses Set ist noch leer.</p>
                    <p className="mt-1 text-sm font-medium text-[color:var(--pf-fg-muted)]">
                      „Neue Vorlage“ lädt ein JPG/PNG — danach bearbeitest du Motive im Editor.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5">
                    {currentSet.templates.map((tpl) => {
                      const phCount = tpl.elements.filter((e) => e.type === "placeholder").length;
                      const designCount = tpl.elements.length - phCount;
                      return (
                        <Card
                          key={tpl.id}
                          padding="none"
                          variant="bordered"
                          interactive
                          role="button"
                          tabIndex={0}
                          onClick={() => editTemplate(tpl)}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter" || ev.key === " ") editTemplate(tpl);
                          }}
                          className="group relative flex flex-col overflow-hidden shadow-[var(--pf-shadow-sm)] ring-1 ring-[color:var(--pf-border)]"
                        >
                          {/* Flachere Vorschau (breiter als hoch); Inhalt skaliert mit Rand */}
                          <div className="relative aspect-[5/4] w-full overflow-hidden bg-[color:var(--pf-bg-muted)]">
                            <div className="absolute inset-0 flex min-h-0 min-w-0 items-center justify-center p-2.5">
                              <div
                                className="relative max-h-full max-w-full overflow-hidden rounded-md bg-[color:var(--pf-bg-elevated)] ring-1 ring-inset ring-[color:var(--pf-border)]"
                                style={{ aspectRatio: `${tpl.width} / ${tpl.height}` }}
                              >
                                <img
                                  src={tpl.bgImage}
                                  alt=""
                                  className="pointer-events-none h-full w-full object-contain"
                                />
                                <div className="pointer-events-none absolute inset-0">
                                  {tpl.elements.map((el) => (
                                    <div
                                      key={el.id}
                                      className={cn(
                                        "absolute border",
                                        el.type === "placeholder"
                                          ? "border-indigo-400 bg-indigo-500/40"
                                          : "border-purple-400 bg-purple-500/40",
                                      )}
                                      style={{
                                        left: `${(el.x / tpl.width) * 100}%`,
                                        top: `${(el.y / tpl.height) * 100}%`,
                                        width: `${(el.w / tpl.width) * 100}%`,
                                        height: `${(el.h / tpl.height) * 100}%`,
                                        transform: `rotate(${el.rotation ?? 0}deg)`,
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 border-t border-[color:var(--pf-border-subtle)] px-2.5 py-2">
                            <div className="min-w-0">
                              <h3 className="truncate text-xs font-semibold text-[color:var(--pf-fg)]">
                                {tpl.name}
                              </h3>
                              <p className="text-[11px] font-medium text-[color:var(--pf-fg-muted)]">
                                {phCount} Motive · {designCount} Design
                              </p>
                            </div>
                            <MoreHorizontal
                              className="shrink-0 text-[color:var(--pf-fg-subtle)]"
                              size={13}
                              strokeWidth={2}
                              aria-hidden
                            />
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <button
                              type="button"
                              className="rounded-lg bg-[color:var(--pf-bg-elevated)] p-1.5 text-[color:var(--pf-fg-muted)] shadow-[var(--pf-shadow-sm)] ring-1 ring-[color:var(--pf-border)] transition-colors hover:text-[color:var(--pf-accent)]"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                void handleRenameTemplate(tpl.id, tpl.name);
                              }}
                              aria-label="Vorlage umbenennen"
                            >
                              <Pencil size={14} strokeWidth={1.75} />
                            </button>
                            <button
                              type="button"
                              className="rounded-lg bg-[color:var(--pf-danger)] p-1.5 text-white shadow-sm ring-1 ring-[color:var(--pf-danger)]/30 transition-colors hover:opacity-95"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                void handleDeleteTemplate(tpl.id);
                              }}
                              aria-label="Vorlage löschen"
                            >
                              <Trash2 size={14} strokeWidth={1.75} />
                            </button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <Folder className="text-[color:var(--pf-fg-faint)]" size={40} strokeWidth={1.25} aria-hidden />
              <p className="text-sm font-medium text-[color:var(--pf-fg-muted)]">
                Wähle ein Vorlagen-Set in der linken Liste.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
