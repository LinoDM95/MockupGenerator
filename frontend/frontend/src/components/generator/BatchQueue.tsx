import { Archive, Loader2, Package, Trash2 } from "lucide-react";

import type { ArtworkItem, TemplateSet } from "../../types/mockup";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Select } from "../ui/Select";
import { ArtworkUploader } from "./ArtworkUploader";

type Progress = { current: number; total: number; message: string };

type Props = {
  onFiles: (files: FileList | null) => void;
  artworks: ArtworkItem[];
  templateSets: TemplateSet[];
  globalSetId: string;
  onGlobalSetId: (id: string) => void;
  onApplyGlobal: () => void;
  onUpdateArtwork: (id: string, key: keyof ArtworkItem, value: string) => void;
  onRemoveArtwork: (id: string) => void;
  onClearAll: () => void;
  isGenerating: boolean;
  progress: Progress;
  onGenerate: () => void;
};

export const BatchQueue = ({
  onFiles,
  artworks,
  templateSets,
  globalSetId,
  onGlobalSetId,
  onApplyGlobal,
  onUpdateArtwork,
  onRemoveArtwork,
  onClearAll,
  isGenerating,
  progress,
  onGenerate,
}: Props) => {
  const missingSet = artworks.some((a) => !a.setId);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="relative z-10 space-y-6 lg:col-span-1">
        <ArtworkUploader onFiles={onFiles} />
        {artworks.length > 0 && (
          <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-800">
              Auf alle anwenden
            </h2>
            <div className="space-y-4">
              <Select
                label="Set für alle Motive"
                value={globalSetId}
                onChange={(e) => onGlobalSetId(e.target.value)}
              >
                <option value="">-- Bitte wählen --</option>
                {templateSets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.templates.length} Vorlagen)
                  </option>
                ))}
              </Select>
              <p className="text-xs text-neutral-600">
                Rahmen pro Vorlage legst du im Vorlagen-Studio unter „Vorlage bearbeiten“ fest.
              </p>
              <Button type="button" className="w-full" onClick={onApplyGlobal}>
                Auf alle {artworks.length} Motive anwenden
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div className="relative flex min-h-[min(560px,70vh)] flex-col lg:col-span-2">
        {artworks.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-neutral-200 bg-white p-12 text-center text-neutral-400">
            <Package size={64} className="mb-4 text-neutral-200" strokeWidth={1} />
            <h3 className="mb-2 text-xl font-medium text-neutral-500">Keine Motive in der Warteschlange</h3>
          </div>
        ) : (
          <div className="flex min-h-[420px] flex-1 flex-col gap-4">
            <div className="flex shrink-0 items-end justify-between">
              <h3 className="text-lg font-bold text-neutral-800">Warteschlange ({artworks.length})</h3>
              <button type="button" onClick={onClearAll} className="text-sm font-medium text-red-500 hover:text-red-700">
                Alle entfernen
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
              {artworks.map((art, index) => (
                <div
                  key={art.id}
                  className="flex flex-col items-center gap-4 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:flex-row"
                >
                  <div className="flex w-full items-center gap-4 sm:w-auto">
                    <span className="w-6 text-lg font-bold text-neutral-300">{index + 1}.</span>
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                      <img src={art.url} className="h-full w-full object-cover" alt="" />
                    </div>
                    <div className="min-w-0 flex-1 sm:w-48">
                      <input
                        type="text"
                        value={art.name}
                        onChange={(e) => onUpdateArtwork(art.id, "name", e.target.value)}
                        className="w-full truncate border-b border-transparent bg-transparent font-bold text-neutral-800 outline-none focus:border-blue-300"
                      />
                    </div>
                  </div>
                  <div className="flex w-full flex-1 flex-col gap-2 sm:w-auto sm:flex-row">
                    <Select
                      value={art.setId}
                      onChange={(e) => onUpdateArtwork(art.id, "setId", e.target.value)}
                      className={!art.setId ? "border-red-300 bg-red-50" : ""}
                    >
                      <option value="" disabled>
                        -- Set wählen --
                      </option>
                      {templateSets.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveArtwork(art.id)}
                    className="ml-auto rounded-lg p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 sm:ml-0"
                    aria-label="Entfernen"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-auto shrink-0 rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg w-full sm:max-w-[380px] sm:self-end">
              {isGenerating ? (
                <div className="flex min-w-[300px] flex-col gap-3">
                  <div className="flex items-center justify-between font-bold text-blue-700">
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin" size={18} /> Verarbeite…
                    </div>
                    <span>
                      {progress.current} / {progress.total}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-neutral-200">
                    <div
                      className="h-2 rounded-full bg-blue-600 transition-all"
                      style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
                    />
                  </div>
                  <p className="truncate text-xs text-neutral-500">{progress.message}</p>
                </div>
              ) : (
                <Button
                  type="button"
                  disabled={missingSet}
                  onClick={onGenerate}
                  className={`w-full gap-3 py-4 text-lg font-bold sm:w-[350px] ${
                    missingSet ? "bg-neutral-300" : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  <Archive size={24} /> {missingSet ? "Sets für alle wählen!" : "ZIP-Datei generieren"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
