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
import { useState } from "react";

import {
  createTemplateSet,
  createTemplateWithUpload,
  deleteTemplate,
  deleteTemplateSet,
  exportSetJson,
  importSetJson,
  patchTemplate,
  patchTemplateSet,
} from "../api/sets";
import { compressImage, dataUrlToBlob, loadImage } from "../lib/canvas/image";
import { getTemplateRenderOpts } from "../lib/canvas/renderOpts";
import { newClientElementId } from "../lib/elementId";
import { getErrorMessage } from "../lib/error";
import { sanitizeFileName } from "../lib/sanitize";
import { toast } from "../lib/toast";
import { useLoadTemplateSets } from "../hooks/useLoadTemplateSets";
import type { Template, TemplateElement } from "../types/mockup";
import { useAppStore } from "../store/appStore";
import { TemplateEditor } from "./editor/TemplateEditor";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { LinearLoadingBar } from "./ui/LinearLoadingBar";

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
  const { frameStyle: defaultFrameStyle, ...frameOpts } = getTemplateRenderOpts(tpl);
  return {
    ...tpl,
    elements,
    defaultFrameStyle,
    ...frameOpts,
  };
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
          toast.error("Vorlage konnte nicht angelegt werden.");
        } finally {
          setProgressMessage(null);
        }
      })();
    };
    reader.readAsDataURL(file);
  };

  const editTemplate = (tpl: Template) => {
    const migrated = migrateTemplate(tpl);
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
        {progressMessage ? <LinearLoadingBar message={progressMessage} /> : null}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditingSetId(null)}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
              aria-label="Zurück"
            >
              <ArrowLeft size={20} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className="group flex cursor-pointer items-center text-left"
              onClick={() => currentSet && handleRenameSet(currentSet.id, currentSet.name)}
            >
              <Folder className="mr-2 text-indigo-600" size={20} strokeWidth={1.75} />
              <h2 className="max-w-sm truncate border-b border-dashed border-transparent text-xl font-semibold text-slate-900 group-hover:border-slate-400">
                {currentSet?.name}
              </h2>
            </button>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700">
            <Plus size={18} strokeWidth={1.75} /> Neue Vorlage (JPG/PNG)
            <input type="file" className="hidden" accept="image/*" onChange={startNewTemplate} />
          </label>
        </div>
        {!currentSet || currentSet.templates.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-12 text-center ring-1 ring-inset ring-slate-900/5">
            <LayoutTemplate className="mx-auto mb-3 text-slate-300" size={48} strokeWidth={1} />
            <p className="font-medium text-slate-600">Dieses Set ist noch leer.</p>
            <p className="mt-1 text-sm text-slate-400">
              Lade ein Hintergrundbild hoch, um eine Vorlage zu erstellen.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {currentSet.templates.map((tpl) => {
              const phCount = tpl.elements.filter((e) => e.type === "placeholder").length;
              const designCount = tpl.elements.length - phCount;
              return (
                <Card
                  key={tpl.id}
                  padding="none"
                  interactive
                  role="button"
                  tabIndex={0}
                  onClick={() => editTemplate(tpl)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") editTemplate(tpl);
                  }}
                  className="group relative flex flex-col overflow-hidden"
                >
                  <div className="relative flex h-40 items-center justify-center overflow-hidden border-b border-slate-100 bg-slate-100 p-2">
                    <div
                      className="relative flex max-h-full max-w-full items-center justify-center"
                      style={{ aspectRatio: `${tpl.width}/${tpl.height}` }}
                    >
                      <img src={tpl.bgImage} alt="" className="block max-h-full max-w-full object-contain" crossOrigin="anonymous" />
                      <div className="absolute inset-0">
                        {tpl.elements.map((el) => (
                          <div
                            key={el.id}
                            className={`absolute border ${
                              el.type === "placeholder"
                                ? "border-indigo-400 bg-indigo-500/40"
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
                    <h3 className="truncate text-sm font-medium text-slate-800">{tpl.name}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {phCount} Motive · {designCount} Design
                    </p>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <button
                      type="button"
                      className="rounded-lg bg-white p-1.5 text-slate-500 ring-1 ring-slate-900/5 transition-colors hover:bg-slate-50 hover:text-indigo-600"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        handleRenameTemplate(tpl.id, tpl.name);
                      }}
                    >
                      <Pencil size={14} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-red-600 p-1.5 text-white ring-1 ring-red-700/20 transition-colors hover:bg-red-700"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        void handleDeleteTemplate(tpl.id);
                      }}
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card>
      {progressMessage ? <LinearLoadingBar message={progressMessage} /> : null}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Deine Vorlagen-Sets
        </h2>
        <div className="flex flex-wrap gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 transition-colors hover:bg-slate-50">
            <UploadCloud size={18} strokeWidth={1.75} /> Set importieren
            <input
              type="file"
              className="hidden"
              accept=".mockup,.json,application/json"
              onChange={(e) => void handleImportSet(e.target.files?.[0] ?? null)}
            />
          </label>
          <Button type="button" onClick={() => void createNewSet()} className="gap-2">
            <FolderPlus size={18} strokeWidth={1.75} /> Neues Set
          </Button>
        </div>
      </div>

      {templateSets.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center ring-1 ring-inset ring-slate-900/5">
          <Folder className="mx-auto mb-3 text-slate-300" size={48} strokeWidth={1} />
          <h3 className="mb-1 text-lg font-semibold text-slate-800">Noch keine Sets vorhanden</h3>
          <p className="text-sm text-slate-500">
            Erstelle ein neues Set oder importiere ein bestehendes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templateSets.map((set) => (
            <Card
              key={set.id}
              padding="sm"
              interactive
              role="button"
              tabIndex={0}
              onClick={() => setEditingSetId(set.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setEditingSetId(set.id);
              }}
              className="group relative flex flex-col justify-between"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 ring-1 ring-inset ring-indigo-500/20">
                  <Folder size={22} strokeWidth={1.75} />
                </div>
                <div className="flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <button
                    type="button"
                    className="rounded-lg bg-white p-1.5 text-slate-400 ring-1 ring-slate-900/5 transition-colors hover:bg-slate-50 hover:text-emerald-600"
                    title="Export"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleExportSet(set.id);
                    }}
                  >
                    <DownloadCloud size={15} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-white p-1.5 text-slate-400 ring-1 ring-slate-900/5 transition-colors hover:bg-slate-50 hover:text-indigo-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleRenameSet(set.id, set.name);
                    }}
                  >
                    <Pencil size={15} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-white p-1.5 text-slate-400 ring-1 ring-slate-900/5 transition-colors hover:bg-slate-50 hover:text-indigo-600"
                    title="Duplizieren"
                    onClick={(e) => {
                      e.stopPropagation();
                      void (async () => {
                        const name = await openPrompt("Name der Kopie:", `${set.name} (Kopie)`);
                        if (!name?.trim()) return;
                        setProgressMessage("Set wird für die Kopie exportiert…");
                        try {
                          const exported = await exportSetJson(set.id);
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
                          toast.success(`Set „${name.trim()}" dupliziert.`);
                        } catch (err) {
                          toast.error(`Duplizieren fehlgeschlagen: ${getErrorMessage(err)}`);
                        } finally {
                          setProgressMessage(null);
                        }
                      })();
                    }}
                  >
                    <Copy size={15} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-white p-1.5 text-slate-400 ring-1 ring-slate-900/5 transition-colors hover:bg-slate-50 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteSet(set.id);
                    }}
                  >
                    <Trash2 size={15} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
              <h3 className="mb-1 text-base font-semibold text-slate-900">{set.name}</h3>
              <p className="flex items-center justify-between text-sm text-slate-500">
                <span>{set.templates.length} Vorlagen</span>
                <ChevronRight size={16} className="text-slate-400 transition-colors group-hover:text-indigo-500" />
              </p>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
};
