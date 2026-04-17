import { AnimatePresence, motion } from "framer-motion";
import { Globe, Loader2, Package, Plus, X, Zap } from "lucide-react";

import {
  templateSetHasTemplates,
  zipBlockReason,
} from "../../lib/generatorZipReadiness";
import { useAppStore } from "../../store/appStore";
import type { ArtworkItem, TemplateSet } from "../../types/mockup";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Dropzone } from "../ui/Dropzone";
import { EmptyState } from "../ui/EmptyState";
import { IntegrationMissingCallout } from "../ui/IntegrationMissingCallout";
import { Select } from "../ui/Select";
import { cn } from "../../lib/cn";

type Progress = {
  current: number;
  total: number;
  message: string;
  packPercent?: number | null;
};

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
  /** Fortschritt läuft im Vollbild-Overlay — hier nur Kurzhinweis */
  inlineProgressMinimal?: boolean;
  onGenerate: () => void;
  gelatoConnected?: boolean;
  onGelatoExport?: () => void;
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
  inlineProgressMinimal = false,
  onGenerate,
  gelatoConnected = false,
  onGelatoExport,
}: Props) => {
  const goToIntegrationWizardStep = useAppStore((s) => s.goToIntegrationWizardStep);
  const zipReason = zipBlockReason(artworks, templateSets);
  const zipDisabled = zipReason !== "ok";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Motive verarbeiten</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {artworks.length === 0
              ? "Noch keine Designs — starte mit einem Upload."
              : `${artworks.length} Design${artworks.length === 1 ? "" : "s"} bereit zum Export`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={artworks.length === 0}
            onClick={onClearAll}
          >
            Liste leeren
          </Button>
          <Button
            type="button"
            disabled={zipDisabled || artworks.length === 0}
            onClick={onGenerate}
            className="gap-2 shadow-lg shadow-indigo-200/60"
          >
            <Zap size={16} fill="currentColor" className="shrink-0" aria-hidden />
            Mockups generieren
          </Button>
        </div>
      </div>

      {artworks.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Noch keine Motive"
          desc="Lade eine oder mehrere Bilddateien hoch, um Mockups im Raster zu erstellen und als ZIP zu exportieren."
          action={
            <Dropzone
              title="Motive hinzufügen"
              description="PNG, JPG, WebP — mehrere Dateien möglich."
              icon={<Plus className="h-8 w-8 text-slate-400" strokeWidth={1.5} aria-hidden />}
              multiple
              accept="image/*"
              onPickFiles={onFiles}
              onChange={(e) => {
                onFiles(e.target.files);
                e.target.value = "";
              }}
              className="min-h-[200px]"
            />
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(260px,300px)_1fr]">
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card padding="md">
              <h3 className="mb-4 text-sm font-bold tracking-tight text-slate-900">
                Auf alle anwenden
              </h3>
              <div className="space-y-4">
                <Select
                  label="Set für alle Motive"
                  value={globalSetId}
                  onChange={(e) => onGlobalSetId(e.target.value)}
                >
                  <option value="">— Bitte wählen —</option>
                  {templateSets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.templates.length} Vorlagen)
                    </option>
                  ))}
                </Select>
                <p className="text-xs font-medium text-slate-500">
                  Rahmen pro Vorlage legst du im Vorlagen-Studio unter „Vorlage bearbeiten“ fest.
                </p>
                <Button type="button" className="w-full" onClick={onApplyGlobal}>
                  Auf alle {artworks.length} Motive anwenden
                </Button>
              </div>
            </Card>
          </aside>

          <div className="min-w-0 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              <AnimatePresence initial={false} mode="popLayout">
                {artworks.map((art, index) => {
                  const preview = art.previewUrl || art.url;
                  const ready = Boolean(art.previewUrl);
                  return (
                    <motion.div
                      key={art.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card padding="sm" className="group flex h-full flex-col">
                        <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100 ring-1 ring-inset ring-slate-900/5">
                          <img
                            src={preview}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => onRemoveArtwork(art.id)}
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-400 opacity-0 shadow-sm ring-1 ring-slate-900/5 transition-all hover:text-red-600 group-hover:opacity-100"
                            aria-label={`${art.name} entfernen`}
                          >
                            <X size={16} strokeWidth={2} aria-hidden />
                          </button>
                          <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-900/10">
                            {index + 1}
                          </span>
                        </div>
                        <div className="mt-3 min-w-0 flex-1">
                          <input
                            type="text"
                            value={art.name}
                            onChange={(e) => onUpdateArtwork(art.id, "name", e.target.value)}
                            className="w-full border-0 bg-transparent p-0 text-sm font-bold text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:text-indigo-600"
                            aria-label="Dateiname"
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                ready ? "bg-emerald-500" : "bg-indigo-500",
                              )}
                              aria-hidden
                            />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              {ready ? "Bereit für Mockup" : "Vorschau wird erstellt"}
                            </span>
                          </div>
                          <div className="mt-3">
                            <Select
                              label=""
                              value={art.setId}
                              onChange={(e) => onUpdateArtwork(art.id, "setId", e.target.value)}
                              className={cn(
                                "!py-2 text-xs",
                                !templateSetHasTemplates(art.setId, templateSets)
                                  ? "border-red-300 bg-red-50"
                                  : "",
                              )}
                              aria-label={`Set für ${art.name}`}
                            >
                              <option value="" disabled>
                                — Set wählen —
                              </option>
                              {templateSets.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.templates.length})
                                </option>
                              ))}
                            </Select>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              <div className="min-h-[200px] sm:aspect-square sm:min-h-0">
                <Dropzone
                  title="Mehr Motive"
                  description="Ziehen oder klicken"
                  icon={<Plus className="h-8 w-8 text-slate-400" strokeWidth={1.5} aria-hidden />}
                  multiple
                  accept="image/*"
                  onPickFiles={onFiles}
                  onChange={(e) => {
                    onFiles(e.target.files);
                    e.target.value = "";
                  }}
                  className="h-full min-h-[200px]"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 sm:max-w-lg sm:p-5">
              {isGenerating ? (
                inlineProgressMinimal ? (
                  <div className="flex min-w-[260px] items-center gap-3 text-sm font-medium text-slate-600">
                    <Loader2 className="shrink-0 animate-spin text-indigo-600" size={18} aria-hidden />
                    <span>Fortschritt siehe Warte-Bereich (unten) …</span>
                  </div>
                ) : (
                  <div className="flex min-w-[300px] flex-col gap-3">
                    <div className="flex items-center justify-between text-sm font-semibold text-indigo-700">
                      <div className="flex items-center gap-2">
                        <Loader2 className="animate-spin" size={16} aria-hidden />
                        Verarbeite…
                      </div>
                      <span>
                        {progress.current} / {progress.total}
                      </span>
                    </div>
                    <div className="app-progress-track">
                      <motion.div
                        className="app-progress-fill app-progress-fill-glow-subtle h-full max-w-full"
                        initial={false}
                        animate={{
                          width: `${((progress.packPercent != null ? progress.packPercent / 100 : progress.current / (progress.total || 1)) * 100)}%`,
                        }}
                        transition={{ ease: "linear", duration: 0.25 }}
                      />
                    </div>
                    <p className="truncate text-xs font-medium text-slate-500">{progress.message}</p>
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-slate-500">
                    ZIP startest du oben mit „Mockups generieren“. Hier optional: Gelato-Export.
                  </p>
                  {gelatoConnected && onGelatoExport ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={zipDisabled}
                      onClick={onGelatoExport}
                      className="w-full gap-3 py-3 text-base font-semibold"
                    >
                      <Globe size={20} strokeWidth={1.75} aria-hidden />
                      Zu Gelato exportieren
                    </Button>
                  ) : null}
                  {!gelatoConnected && onGelatoExport ? (
                    <IntegrationMissingCallout
                      title="Gelato ist nicht verbunden"
                      description="Verbinde dein Gelato-Konto, um Mockups direkt als Produkte zu exportieren."
                      actionLabel="Gelato einrichten"
                      onSetup={() => goToIntegrationWizardStep(1)}
                    />
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
