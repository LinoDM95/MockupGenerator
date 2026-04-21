import { motion } from "framer-motion";
import { Globe, Layers, Loader2, Zap } from "lucide-react";

import { GENERATOR_IMAGE_ACCEPT_HTML } from "../../lib/generator/imageUploadAccept";
import {
  templateSetHasTemplates,
  zipBlockReason,
} from "../../lib/generator/generatorZipReadiness";
import { useAppStore } from "../../store/appStore";
import type { ArtworkItem, TemplateSet } from "../../types/mockup";
import { AppPageSectionHeader } from "../ui/layout/AppPageSectionHeader";
import { Button } from "../ui/primitives/Button";
import { Card } from "../ui/primitives/Card";
import { IntegrationMissingCallout } from "../ui/patterns/IntegrationMissingCallout";
import { Select } from "../ui/primitives/Select";
import {
  UploadQueueCard,
  UploadQueueCardFooter,
  UploadQueueCardIndexBadge,
  UploadQueueCardMedia,
  UploadQueueCardRemoveButton,
  UploadQueueGrid,
  UploadQueueMotionItem,
} from "../ui/patterns/UploadQueueGrid";
import { WorkspaceEngineSplitLayout } from "../ui/layout/WorkspaceEngineSplitLayout";
import { ArtworkListThumbnail } from "./ArtworkListThumbnail";
import { cn } from "../../lib/ui/cn";

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
  /** unknown = Status wird geladen (kein „nicht verbunden“-Callout). */
  gelatoPhase?: "unknown" | "ready" | "missing";
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
  gelatoPhase = "unknown",
  onGelatoExport,
}: Props) => {
  const goToIntegrationWizardStep = useAppStore((s) => s.goToIntegrationWizardStep);
  const zipReason = zipBlockReason(artworks, templateSets);
  const zipDisabled = zipReason !== "ok";

  return (
    <div className="space-y-8">
      <AppPageSectionHeader
        icon={Layers}
        title="Motive verarbeiten"
        description={
          artworks.length === 0
            ? "Noch keine Designs — Einstellungen links, Motive rechts per Dropzone oder Klick hinzufügen."
            : `${artworks.length} Design${artworks.length === 1 ? "" : "s"} bereit zum Export`
        }
      />

      <WorkspaceEngineSplitLayout
        variant="queue"
        narrowPrimary
        primaryAriaLabel="Generator-Einstellungen und Aktionen"
        secondaryAriaLabel="Motive hochladen"
        primary={
          <>
            <Card padding="md" variant="embedded">
              <h3 className="mb-4 text-sm font-bold tracking-tight text-slate-900">Aktionen</h3>
              <div className="flex flex-col gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center"
                  onClick={onClearAll}
                  disabled={artworks.length === 0 || isGenerating}
                >
                  Liste leeren
                </Button>
                <Button
                  type="button"
                  disabled={zipDisabled || isGenerating}
                  onClick={onGenerate}
                  className="w-full justify-center gap-2 shadow-lg shadow-indigo-200/60"
                >
                  <Zap size={16} fill="currentColor" className="shrink-0" aria-hidden />
                  Mockups generieren
                </Button>
              </div>

              <div className="mt-5 border-t border-slate-200/80 pt-5">
                {isGenerating ? (
                  inlineProgressMinimal ? (
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                      <Loader2 className="shrink-0 animate-spin text-indigo-600" size={18} aria-hidden />
                      <span>Fortschritt siehe Warte-Bereich …</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
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
                      Optional: Motive als Produkte an Gelato senden.
                    </p>
                    {gelatoPhase === "unknown" && onGelatoExport ? (
                      <div
                        className="flex items-center gap-3 rounded-xl bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-900/5"
                        role="status"
                        aria-live="polite"
                      >
                        <Loader2
                          className="shrink-0 animate-spin text-indigo-600"
                          size={18}
                          aria-hidden
                        />
                        <span>Gelato-Verbindung wird geprüft …</span>
                      </div>
                    ) : null}
                    {gelatoPhase === "ready" && onGelatoExport ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={zipDisabled || isGenerating}
                        onClick={onGelatoExport}
                        className="w-full gap-2 py-2.5 text-sm font-semibold"
                      >
                        <Globe size={18} strokeWidth={1.75} aria-hidden />
                        Zu Gelato exportieren
                      </Button>
                    ) : null}
                    {gelatoPhase === "missing" && onGelatoExport ? (
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
            </Card>

            <Card padding="md" variant="embedded">
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
                <Button
                  type="button"
                  className="w-full"
                  onClick={onApplyGlobal}
                  disabled={artworks.length === 0}
                >
                  {artworks.length === 0
                    ? "Auf alle Motive anwenden"
                    : `Auf alle ${artworks.length} Motive anwenden`}
                </Button>
              </div>
            </Card>
          </>
        }
        secondary={
          <UploadQueueGrid
            label="Motive"
            dropzoneTitle={artworks.length === 0 ? "Motive hinzufügen" : "Mehr Motive"}
            dropzoneDescription="PNG, JPG, WebP — mehrere Dateien möglich."
            accept={GENERATOR_IMAGE_ACCEPT_HTML}
            onPickFiles={onFiles}
          >
            {artworks.map((art, index) => {
              const ready = Boolean(art.previewUrl);
              return (
                <UploadQueueMotionItem key={art.id}>
                  <UploadQueueCard>
                    <UploadQueueCardMedia>
                      <ArtworkListThumbnail
                        previewUrl={art.previewUrl}
                        className="absolute inset-0 shrink-0 rounded-none border-0 bg-slate-100"
                        imgClassName="object-cover"
                        placeholderLoaderClassName="h-9 w-9"
                      />
                      <UploadQueueCardRemoveButton
                        onClick={() => onRemoveArtwork(art.id)}
                        ariaLabel={`${art.name} entfernen`}
                      />
                      <UploadQueueCardIndexBadge index={index} />
                    </UploadQueueCardMedia>
                    <UploadQueueCardFooter>
                      <input
                        type="text"
                        value={art.name}
                        onChange={(e) =>
                          onUpdateArtwork(art.id, "name", e.target.value)
                        }
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
                          {ready
                            ? "Bereit für Mockup"
                            : "Vorschau wird erstellt"}
                        </span>
                      </div>
                      <div className="mt-3">
                        <Select
                          label=""
                          value={art.setId}
                          onChange={(e) =>
                            onUpdateArtwork(art.id, "setId", e.target.value)
                          }
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
                    </UploadQueueCardFooter>
                  </UploadQueueCard>
                </UploadQueueMotionItem>
              );
            })}
          </UploadQueueGrid>
        }
      />
    </div>
  );
};
