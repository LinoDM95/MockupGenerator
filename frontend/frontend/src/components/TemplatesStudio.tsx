import {
  ArrowLeft,
  ChevronRight,
  Copy,
  DownloadCloud,
  Folder,
  FolderPlus,
  LayoutTemplate,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "../api/client";
import {
  createTemplateSet,
  createTemplateWithUpload,
  deleteTemplate,
  deleteTemplateSet,
  exportSetJson,
  fetchTemplateSets,
  importSetJson,
  patchTemplate,
  patchTemplateSet,
} from "../api/sets";
import { compressImage, dataUrlToBlob, loadImage } from "../lib/canvas/image";
import { newClientElementId } from "../lib/elementId";
import { toast } from "../lib/toast";
import type { Template, TemplateElement } from "../types/mockup";
import { useAppStore } from "../store/appStore";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { TemplateEditor } from "./editor/TemplateEditor";

const migrateTemplate = (tpl: Template): Template => {
  let elements = tpl.elements;
  if (!elements?.length && (tpl as unknown as { placeholders?: TemplateElement[] }).placeholders) {
    elements = ((tpl as unknown as { placeholders: TemplateElement[] }).placeholders || []).map(
      (ph) => ({ ...ph, type: "placeholder" as const }),
    );
  }
  elements = (elements || []).map((el) => ({
    ...el,
    rotation: el.rotation ?? 0,
    shadowEnabled: el.shadowEnabled ?? false,
    shadowColor: el.shadowColor ?? "rgba(0,0,0,0.5)",
    shadowBlur: el.shadowBlur ?? 20,
    shadowOffsetX: el.shadowOffsetX ?? 10,
    shadowOffsetY: el.shadowOffsetY ?? 10,
    textCurve: el.textCurve ?? 0,
  }));
  return { ...tpl, elements };
};

export const TemplatesStudio = () => {
  const templateSets = useAppStore((s) => s.templateSets);
  const setTemplateSets = useAppStore((s) => s.setTemplateSets);
  const editingSetId = useAppStore((s) => s.editingSetId);
  const setEditingSetId = useAppStore((s) => s.setEditingSetId);
  const editingTemplate = useAppStore((s) => s.editingTemplate);
  const setEditingTemplate = useAppStore((s) => s.setEditingTemplate);
  const setSelectedElementId = useAppStore((s) => s.setSelectedElementId);
  const openPrompt = useAppStore((s) => s.openPrompt);
  const openConfirm = useAppStore((s) => s.openConfirm);
  const setGlobalSetId = useAppStore((s) => s.setGlobalSetId);

  const [loading, setLoading] = useState(false);

  const reloadSets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTemplateSets();
      setTemplateSets(data);
      if (data.length && !useAppStore.getState().globalSetId) {
        setGlobalSetId(data[0].id);
      }
    } catch (e) {
      console.error(e);
      toast.error(`Sets konnten nicht geladen werden: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [setGlobalSetId, setTemplateSets]);

  useEffect(() => {
    void reloadSets();
  }, [reloadSets]);

  const createNewSet = async () => {
    const name = await openPrompt("Name des neuen Vorlagen-Sets:", "Neues Set");
    if (!name) return;
    try {
      const created = await createTemplateSet(name.trim());
      await reloadSets();
      setEditingSetId(created.id);
    } catch (e) {
      toast.error(`Fehler: ${e instanceof Error ? e.message : String(e)}`);
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
      toast.error(`Fehler: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleRenameSet = async (setId: string, current: string) => {
    const name = await openPrompt("Set umbenennen:", current);
    if (!name?.trim()) return;
    try {
      await patchTemplateSet(setId, name.trim());
      await reloadSets();
    } catch (e) {
      toast.error(`Fehler: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleExportSet = async (setId: string) => {
    try {
      const data = await exportSetJson(setId);
      const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data))}`;
      const a = document.createElement("a");
      a.href = dataStr;
      const setName = templateSets.find((s) => s.id === setId)?.name ?? "set";
      a.download = `${setName.replace(/[^a-zA-Z0-9_-]/g, "_")}.mockup`;
      a.click();
    } catch (e) {
      toast.error(`Export fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleImportSet = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    try {
      const body = JSON.parse(text) as unknown;
      await importSetJson(body);
      await reloadSets();
      toast.success("Set importiert.");
    } catch (e) {
      let msg = "Import fehlgeschlagen.";
      if (e instanceof SyntaxError) {
        msg = "Import fehlgeschlagen: Datei ist kein gültiges JSON.";
      } else if (e instanceof ApiError) {
        try {
          const j = JSON.parse(e.body) as { detail?: unknown };
          if (typeof j.detail === "string") msg = `Import: ${j.detail}`;
          else if (Array.isArray(j.detail)) msg = `Import: ${JSON.stringify(j.detail)}`;
          else msg = `Import: ${e.message}`;
        } catch {
          msg = `Import: ${e.message}`;
        }
      }
      toast.error(msg);
    }
  };

  const startNewTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editingSetId) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = await compressImage(reader.result as string);
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
        await createTemplateWithUpload(editingSetId, blob, file.name || "template.jpg", {
          name: "Neue Vorlage",
          elements: [initialElement],
        });
        await reloadSets();
      } catch (err) {
        console.error(err);
        toast.error("Vorlage konnte nicht angelegt werden.");
      }
    };
    reader.readAsDataURL(file);
  };

  const editTemplate = (tpl: Template) => {
    setEditingTemplate(migrateTemplate(tpl));
    setSelectedElementId(migrateTemplate(tpl).elements[0]?.id ?? null);
  };

  const handleDeleteTemplate = async (tplId: string) => {
    const ok = await openConfirm("Diese Vorlage wirklich löschen?");
    if (!ok) return;
    try {
      await deleteTemplate(tplId);
      await reloadSets();
    } catch (e) {
      toast.error(`Fehler: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleRenameTemplate = async (tplId: string, current: string) => {
    const name = await openPrompt("Vorlage umbenennen:", current);
    if (!name?.trim()) return;
    try {
      await patchTemplate(tplId, { name: name.trim() });
      await reloadSets();
    } catch (e) {
      toast.error(`Fehler: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  if (editingTemplate) {
    return (
      <TemplateEditor
        onClose={() => {
          setEditingTemplate(null);
          setSelectedElementId(null);
        }}
        onSaved={reloadSets}
      />
    );
  }

  if (editingSetId) {
    const currentSet = templateSets.find((s) => s.id === editingSetId);
    return (
      <Card>
        <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditingSetId(null)}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"
              aria-label="Zurück"
            >
              <ArrowLeft size={20} />
            </button>
            <button
              type="button"
              className="group flex cursor-pointer items-center text-left"
              onClick={() => currentSet && handleRenameSet(currentSet.id, currentSet.name)}
            >
              <Folder className="mr-2 text-amber-500" />
              <h2 className="max-w-sm truncate border-b border-dashed border-transparent text-xl font-bold text-neutral-900 group-hover:border-neutral-400">
                {currentSet?.name}
              </h2>
            </button>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
            <Plus size={18} /> Neue Vorlage (JPG/PNG)
            <input type="file" className="hidden" accept="image/*" onChange={startNewTemplate} />
          </label>
        </div>
        {loading && <p className="text-sm text-neutral-500">Lade…</p>}
        {!currentSet || currentSet.templates.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 py-12 text-center">
            <LayoutTemplate className="mx-auto mb-3 text-neutral-300" size={48} />
            <p className="font-medium text-neutral-600">Dieses Set ist noch leer.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
            {currentSet.templates.map((tpl) => {
              const phCount = tpl.elements.filter((e) => e.type === "placeholder").length;
              const designCount = tpl.elements.length - phCount;
              return (
                <div
                  key={tpl.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => editTemplate(tpl)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") editTemplate(tpl);
                  }}
                  className="group relative cursor-pointer overflow-hidden rounded-xl border border-neutral-200 bg-white transition-shadow hover:shadow-md"
                >
                  <div className="relative flex h-40 items-center justify-center overflow-hidden border-b border-neutral-200 bg-neutral-200 p-2">
                    <div
                      className="relative flex max-h-full max-w-full items-center justify-center shadow-sm"
                      style={{ aspectRatio: `${tpl.width}/${tpl.height}` }}
                    >
                      <img src={tpl.bgImage} alt="" className="block max-h-full max-w-full object-contain" crossOrigin="anonymous" />
                      <div className="absolute inset-0">
                        {tpl.elements.map((el) => (
                          <div
                            key={el.id}
                            className={`absolute border ${
                              el.type === "placeholder"
                                ? "border-blue-400 bg-blue-500/40"
                                : "border-purple-400 bg-purple-500/40"
                            }`}
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
                  <div className="p-3 pr-10">
                    <h3 className="truncate text-sm font-semibold text-neutral-800">{tpl.name}</h3>
                    <p className="mt-1 text-xs text-neutral-500">
                      {phCount} Motive • {designCount} Design
                    </p>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      className="rounded-md border border-neutral-200 bg-white p-1.5 text-neutral-500 shadow-sm hover:text-blue-600"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        handleRenameTemplate(tpl.id, tpl.name);
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-red-500/90 p-1.5 text-white shadow-sm hover:bg-red-600"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        void handleDeleteTemplate(tpl.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Deine Vorlagen-Sets</h2>
        <div className="flex flex-wrap gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            <UploadCloud size={18} /> Set importieren
            <input
              type="file"
              className="hidden"
              accept=".mockup,.json,application/json"
              onChange={(e) => void handleImportSet(e.target.files?.[0] ?? null)}
            />
          </label>
          <Button variant="secondary" type="button" onClick={() => void createNewSet()} className="gap-2">
            <FolderPlus size={18} /> Neues Set
          </Button>
        </div>
      </div>
      {loading ? <p className="text-sm text-neutral-500">Lade…</p> : null}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {templateSets.map((set) => (
          <div
            key={set.id}
            role="button"
            tabIndex={0}
            onClick={() => setEditingSetId(set.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setEditingSetId(set.id);
            }}
            className="group relative cursor-pointer rounded-xl border border-neutral-200 bg-neutral-50 p-5 transition-all hover:border-blue-400 hover:shadow-md"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-lg bg-amber-100 p-3 text-amber-600">
                <Folder size={24} />
              </div>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  className="rounded border border-neutral-100 bg-white p-1.5 text-neutral-400 shadow-sm hover:text-green-600"
                  title="Export"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleExportSet(set.id);
                  }}
                >
                  <DownloadCloud size={16} />
                </button>
                <button
                  type="button"
                  className="rounded border border-neutral-100 bg-white p-1.5 text-neutral-400 shadow-sm hover:text-blue-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleRenameSet(set.id, set.name);
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="rounded border border-neutral-100 bg-white p-1.5 text-neutral-400 shadow-sm hover:text-blue-500"
                  title="Duplizieren"
                  onClick={(e) => {
                    e.stopPropagation();
                    void (async () => {
                      const name = await openPrompt("Name der Kopie:", `${set.name} (Kopie)`);
                      if (!name?.trim()) return;
                      try {
                        const exported = await exportSetJson(set.id);
                        const created = await createTemplateSet(name.trim());
                        for (const t of exported.templates) {
                          const res = await fetch(t.bgImage);
                          if (!res.ok) throw new Error(`Bild ${t.name}`);
                          const blob = await res.blob();
                          await createTemplateWithUpload(created.id, blob, "background.jpg", {
                            name: t.name,
                            elements: t.elements,
                          });
                        }
                        await reloadSets();
                        toast.success(`Set „${name.trim()}“ dupliziert.`);
                      } catch (err) {
                        const msg =
                          err instanceof ApiError
                            ? (() => {
                                try {
                                  const j = JSON.parse(err.body) as { detail?: unknown };
                                  return typeof j.detail === "string" ? j.detail : err.message;
                                } catch {
                                  return err.message;
                                }
                              })()
                            : err instanceof Error
                              ? err.message
                              : "Unbekannter Fehler";
                        toast.error(`Duplizieren fehlgeschlagen: ${msg}`);
                      }
                    })();
                  }}
                >
                  <Copy size={16} />
                </button>
                <button
                  type="button"
                  className="rounded border border-neutral-100 bg-white p-1.5 text-neutral-400 shadow-sm hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDeleteSet(set.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <h3 className="mb-1 text-lg font-bold text-neutral-900">{set.name}</h3>
            <p className="flex items-center justify-between text-sm text-neutral-500">
              <span>{set.templates.length} Vorlagen</span>
              <ChevronRight size={18} className="text-neutral-400 transition-colors group-hover:text-blue-500" />
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
};
