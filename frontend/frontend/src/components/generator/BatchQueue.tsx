import { AnimatePresence, motion } from "framer-motion";
import { Archive, Globe, Loader2, Package, Trash2 } from "lucide-react";

import {
  templateSetHasTemplates,
  zipBlockReason,
} from "../../lib/generatorZipReadiness";
import { useAppStore } from "../../store/appStore";
import type { ArtworkItem, TemplateSet } from "../../types/mockup";
import { Button } from "../ui/Button";
import { IntegrationMissingCallout } from "../ui/IntegrationMissingCallout";
import { Card } from "../ui/Card";
import { Select } from "../ui/Select";
import { ArtworkUploader } from "./ArtworkUploader";

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
  /** Fortschritt laeuft im Vollbild-Overlay — hier nur Kurzhinweis */
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
  const zipPrimaryLabel =
    zipReason === "missing_set"
      ? "Sets für alle wählen!"
      : zipReason === "no_templates"
        ? "Set braucht Vorlagen!"
        : "ZIP-Datei generieren";

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="relative z-10 space-y-6 lg:col-span-1">
        <ArtworkUploader onFiles={onFiles} />
        {artworks.length > 0 && (
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-slate-900">
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
              <p className="text-xs text-slate-500">
                Rahmen pro Vorlage legst du im Vorlagen-Studio unter „Vorlage bearbeiten" fest.
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
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <Package size={56} className="mb-4 text-slate-300" strokeWidth={1} />
            <h3 className="mb-1 text-lg font-semibold text-slate-800">
              Keine Motive in der Warteschlange
            </h3>
            <p className="text-sm text-slate-500">
              Lade Motive hoch, um loszulegen.
            </p>
          </div>
        ) : (
          <div className="flex min-h-[420px] flex-1 flex-col gap-4">
            <div className="flex shrink-0 items-end justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Warteschlange ({artworks.length})
              </h3>
              <button
                type="button"
                onClick={onClearAll}
                className="text-sm font-medium text-red-500 transition-colors hover:text-red-700"
              >
                Alle entfernen
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden pr-1">
              <AnimatePresence initial={false} mode="popLayout">
                {artworks.map((art, index) => (
                  <motion.div
                    key={art.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{
                      opacity: 0,
                      height: 0,
                      marginTop: 0,
                      marginBottom: 0,
                      paddingTop: 0,
                      paddingBottom: 0,
                    }}
                    transition={{ duration: 0.2, layout: { duration: 0.2, ease: "easeOut" } }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 transition-shadow duration-200 hover:shadow-sm sm:flex-row">
                      <div className="flex w-full items-center gap-3 sm:w-auto">
                        <span className="w-6 text-center text-sm font-medium text-slate-400">
                          {index + 1}
                        </span>
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          <img
                            src={art.previewUrl ?? art.url}
                            className="h-full w-full object-cover"
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <div className="min-w-0 flex-1 sm:w-48">
                          <input
                            type="text"
                            value={art.name}
                            onChange={(e) => onUpdateArtwork(art.id, "name", e.target.value)}
                            className="w-full truncate border-b border-transparent bg-transparent text-sm font-medium text-slate-800 outline-none transition-colors focus:border-indigo-400"
                          />
                        </div>
                      </div>

                      <div className="flex w-full flex-1 flex-col gap-2 sm:w-auto sm:flex-row">
                        <Select
                          value={art.setId}
                          onChange={(e) => onUpdateArtwork(art.id, "setId", e.target.value)}
                          className={
                            !templateSetHasTemplates(art.setId, templateSets)
                              ? "border-red-300 bg-red-50"
                              : ""
                          }
                        >
                          <option value="" disabled>
                            -- Set wählen --
                          </option>
                          {templateSets.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.templates.length} Vorlagen)
                            </option>
                          ))}
                        </Select>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveArtwork(art.id)}
                        className="ml-auto rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 sm:ml-0"
                        aria-label="Entfernen"
                      >
                        <Trash2 size={16} strokeWidth={1.75} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="mt-auto w-full shrink-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:max-w-[420px] sm:self-end">
              {isGenerating ? (
                inlineProgressMinimal ? (
                  <div className="flex min-w-[260px] items-center gap-3 text-sm text-slate-600">
                    <Loader2 className="shrink-0 animate-spin text-indigo-600" size={18} />
                    <span>Fortschritt siehe Vollbildanzeige …</span>
                  </div>
                ) : (
                  <div className="flex min-w-[300px] flex-col gap-3">
                    <div className="flex items-center justify-between text-sm font-semibold text-indigo-700">
                      <div className="flex items-center gap-2">
                        <Loader2 className="animate-spin" size={16} /> Verarbeite…
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
                    <p className="truncate text-xs text-slate-500">{progress.message}</p>
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    disabled={zipDisabled}
                    onClick={onGenerate}
                    className="w-full gap-3 py-3 text-base font-semibold"
                  >
                    <Archive size={20} strokeWidth={1.75} />
                    {zipPrimaryLabel}
                  </Button>
                  {gelatoConnected && onGelatoExport ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={zipDisabled}
                      onClick={onGelatoExport}
                      className="w-full gap-3 py-3 text-base font-semibold"
                    >
                      <Globe size={20} strokeWidth={1.75} />
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
        )}
      </div>
    </div>
  );
};
