import { motion } from "framer-motion";
import { Filter, Globe, Loader2, Play, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { GENERATOR_IMAGE_ACCEPT_HTML } from "../../lib/generator/imageUploadAccept";
import { filterArtworksByQuery } from "../../lib/generator/artworkSearch";
import {
  templateSetHasTemplates,
  zipBlockReason,
} from "../../lib/generator/generatorZipReadiness";
import { useAppStore } from "../../store/appStore";
import type { ArtworkItem, TemplateSet } from "../../types/mockup";
import { useCanvasRender } from "../../hooks/useCanvasRender";
import {
  WORKSPACE_PANEL_HEADER,
  WORKSPACE_PANEL_TITLE,
  workspacePanelCardClassName,
} from "../../lib/ui/workspaceSurfaces";
import { cn } from "../../lib/ui/cn";
import { Button } from "../ui/primitives/Button";
import { IntegrationMissingCallout } from "../ui/patterns/IntegrationMissingCallout";
import { Select } from "../ui/primitives/Select";
import { ArtworkListThumbnail } from "./ArtworkListThumbnail";
import { GeneratorMockupPreviewGrid } from "./GeneratorMockupPreviewGrid";

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

const formatTotalMb = (artworks: ArtworkItem[]): string => {
  const bytes = artworks.reduce((s, a) => s + (a.file?.size ?? 0), 0);
  const mb = bytes / (1024 * 1024);
  if (bytes === 0) return "0 MB";
  return mb < 0.1 ? mb.toFixed(2) : mb.toFixed(1);
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
  const navigate = useNavigate();
  const goToIntegrationWizardStep = useAppStore((s) => s.goToIntegrationWizardStep);
  const { loadImage } = useCanvasRender();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<0 | 1 | 2>(0);

  const zipReason = zipBlockReason(artworks, templateSets);
  const zipDisabled = zipReason !== "ok";

  const totalMbLabel = useMemo(() => formatTotalMb(artworks), [artworks]);

  const filteredArtworks = useMemo(
    () => filterArtworksByQuery(artworks, searchQuery),
    [artworks, searchQuery],
  );

  const listPool =
    filteredArtworks.length > 0 ? filteredArtworks : artworks;

  useEffect(() => {
    if (artworks.length === 0) {
      setSelectedArtworkId(null);
      return;
    }
    const filtered = filterArtworksByQuery(artworks, searchQuery);
    const pool = filtered.length > 0 ? filtered : artworks;
    setSelectedArtworkId((id) => {
      if (id && pool.some((a) => a.id === id)) return id;
      return pool[0]?.id ?? null;
    });
  }, [artworks, searchQuery]);

  const selectedArtwork = useMemo(
    () => artworks.find((a) => a.id === selectedArtworkId) ?? null,
    [artworks, selectedArtworkId],
  );

  const selectedTemplateSet = useMemo(() => {
    if (!selectedArtwork?.setId) return undefined;
    return templateSets.find((s) => s.id === selectedArtwork.setId);
  }, [selectedArtwork?.setId, templateSets]);

  const handlePickFiles = () => fileInputRef.current?.click();

  const rightTabs: readonly { id: 0 | 1 | 2; label: string }[] = [
    { id: 0, label: "Listing" },
    { id: 1, label: "Vorlage" },
    { id: 2, label: "Export" },
  ] as const;

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-col">
      <div
        className="grid min-h-0 w-full min-w-0 gap-4 max-lg:grid-cols-1 lg:grid-cols-[300px_1fr_320px]"
        style={{ minHeight: "min(820px, calc(100dvh - 100px))" }}
      >
        {/* Links: Motive (Prototyp GeneratorScreen) */}
        <div className={cn(workspacePanelCardClassName, "min-h-[20rem] max-lg:min-h-0")}>
          <div className={WORKSPACE_PANEL_HEADER}>
            <div className="flex w-full items-center justify-between gap-2">
              <div>
                <div className={WORKSPACE_PANEL_TITLE}>Motive</div>
                <div className="text-xs text-[color:var(--pf-fg-subtle)]">
                  {artworks.length} Dateien · {totalMbLabel} MB
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={handlePickFiles}
                disabled={isGenerating}
              >
                <Upload size={12} aria-hidden />
                Upload
              </Button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 gap-1.5 border-b border-[color:var(--pf-border-subtle)] px-2.5 py-2">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[5px] border border-[color:var(--pf-border-subtle)] bg-[color:var(--pf-bg-muted)] px-2 py-1">
                <span className="sr-only">Filtern</span>
                <input
                  ref={filterInputRef}
                  type="search"
                  placeholder="Filtern…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={artworks.length === 0}
                  className="min-w-0 flex-1 bg-transparent text-xs text-[color:var(--pf-fg)] outline-none placeholder:text-[color:var(--pf-fg-faint)]"
                />
              </div>
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[color:var(--pf-fg-subtle)] hover:bg-[color:var(--pf-bg-muted)]"
                aria-label="Filter (Suche)"
                onClick={() => filterInputRef.current?.focus()}
              >
                <Filter size={13} aria-hidden />
              </button>
            </div>

            <ul
              className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1.5"
              aria-label="Liste der Motive"
            >
              {artworks.length === 0 ? (
                <li className="rounded-md border border-dashed border-[color:var(--pf-border)] px-3 py-8 text-center text-sm font-medium text-[color:var(--pf-fg-muted)]">
                  Noch keine Motive — oben „Upload“.
                </li>
              ) : (
                listPool.map((art) => {
                  const ready = Boolean(art.previewUrl);
                  const isSelected = art.id === selectedArtworkId;
                  return (
                    <li key={art.id}>
                      <div
                        className={cn(
                          "flex items-stretch gap-0.5 rounded-md transition-colors",
                          isSelected
                            ? "border border-[color:var(--pf-accent-border)] bg-[color:var(--pf-accent-bg)]"
                            : "border border-transparent hover:bg-[color:var(--pf-bg-muted)]",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedArtworkId(art.id)}
                          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-2 text-left"
                          aria-current={isSelected ? "true" : undefined}
                        >
                          <div
                            className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-[color:var(--pf-border)] bg-[color:var(--pf-bg-muted)]"
                          >
                            <ArtworkListThumbnail
                              previewUrl={art.previewUrl}
                              className="absolute inset-0 shrink-0 rounded-none border-0 bg-[color:var(--pf-bg-muted)]"
                              imgClassName="object-cover"
                              placeholderLoaderClassName="h-5 w-5"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-[color:var(--pf-fg)]">
                              {art.name}
                            </p>
                            <p className="text-[11px] text-[color:var(--pf-fg-subtle)]">
                              {(art.file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                          <span
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              ready ? "bg-[color:var(--pf-success)]" : "bg-[color:var(--pf-accent)]",
                            )}
                            aria-hidden
                          />
                        </button>
                        <button
                          type="button"
                          className="flex shrink-0 items-center justify-center rounded-md px-2 text-[color:var(--pf-fg-faint)] transition-colors hover:bg-[color:var(--pf-danger-bg)] hover:text-[color:var(--pf-danger)]"
                          aria-label={`${art.name} entfernen`}
                          onClick={() => onRemoveArtwork(art.id)}
                          disabled={isGenerating}
                        >
                          <Trash2 size={14} aria-hidden />
                        </button>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>

            <input
              ref={fileInputRef}
              type="file"
              accept={GENERATOR_IMAGE_ACCEPT_HTML}
              multiple
              className="sr-only"
              onChange={(e) => {
                onFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* Mitte: Vorschau */}
        <div className={cn(workspacePanelCardClassName, "min-h-[20rem] max-lg:min-h-[18rem]")}>
          <div className={WORKSPACE_PANEL_HEADER}>
            <div className="flex min-w-0 items-center gap-2">
              <span className={cn(WORKSPACE_PANEL_TITLE, "truncate")}>
                {selectedArtwork?.name ?? "Vorschau"}
              </span>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto bg-[color:var(--pf-bg-subtle)] p-5">
            <GeneratorMockupPreviewGrid
              artwork={selectedArtwork}
              templateSet={selectedTemplateSet}
              templateSets={templateSets}
              loadImageFn={loadImage}
            />
          </div>
        </div>

        {/* Rechts: Tabs wie Prototyp */}
        <div className={cn(workspacePanelCardClassName, "min-h-0 max-lg:min-h-0")}>
          <div className="flex shrink-0 border-b border-[color:var(--pf-border)]">
            {rightTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setRightTab(t.id)}
                className={cn(
                  "flex-1 px-3 py-2.5 text-center text-xs font-medium transition-colors",
                  rightTab === t.id
                    ? "border-b-2 border-[color:var(--pf-accent)] text-[color:var(--pf-fg)]"
                    : "border-b-2 border-transparent text-[color:var(--pf-fg-muted)] hover:text-[color:var(--pf-fg)]",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3.5">
            {rightTab === 0 ? (
              <div className="space-y-3 text-sm font-medium text-[color:var(--pf-fg-muted)]">
                <p>
                  Listing-Titel, Tags und Beschreibung bearbeitest du nach dem Export unter{" "}
                  <strong className="text-[color:var(--pf-fg)]">Publizieren → Etsy-Listings</strong>.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate("/app/publizieren/etsy")}
                >
                  Zu Etsy-Listings
                </Button>
              </div>
            ) : null}

            {rightTab === 1 ? (
              <div className="space-y-4">
                {selectedArtwork ? (
                  <Select
                    label="Set für dieses Motiv"
                    value={selectedArtwork.setId}
                    onChange={(e) =>
                      onUpdateArtwork(selectedArtwork.id, "setId", e.target.value)
                    }
                    className={cn(
                      "!py-2 text-xs",
                      !templateSetHasTemplates(selectedArtwork.setId, templateSets)
                        ? "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-950/40"
                        : "",
                    )}
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
                ) : (
                  <p className="text-sm text-[color:var(--pf-fg-muted)]">
                    Wähle links ein Motiv, um das Set zuzuweisen.
                  </p>
                )}
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
                <p className="text-xs font-medium text-[color:var(--pf-fg-muted)]">
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
            ) : null}

            {rightTab === 2 ? (
              <div className="space-y-4">
                <Button
                  type="button"
                  disabled={zipDisabled || isGenerating}
                  onClick={onGenerate}
                  className="w-full justify-center gap-2"
                >
                  <Play size={14} className="shrink-0" aria-hidden />
                  Mockups erstellen
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center"
                  onClick={onClearAll}
                  disabled={artworks.length === 0 || isGenerating}
                >
                  Liste leeren
                </Button>

                {isGenerating ? (
                  inlineProgressMinimal ? (
                    <div className="flex items-center gap-3 text-sm font-medium text-[color:var(--pf-fg-muted)]">
                      <Loader2
                        className="shrink-0 animate-spin text-[color:var(--pf-accent)]"
                        size={18}
                        aria-hidden
                      />
                      <span>Fortschritt siehe Warte-Bereich …</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between text-sm font-semibold text-[color:var(--pf-accent)]">
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
                            width: `${(progress.packPercent != null
                              ? progress.packPercent / 100
                              : progress.current / (progress.total || 1)) * 100}%`,
                          }}
                          transition={{ ease: "linear", duration: 0.25 }}
                        />
                      </div>
                      <p className="truncate text-xs font-medium text-[color:var(--pf-fg-muted)]">
                        {progress.message}
                      </p>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-[color:var(--pf-fg-muted)]">
                      Optional: Motive als Produkte an Gelato senden.
                    </p>
                    {gelatoPhase === "unknown" && onGelatoExport ? (
                      <div
                        className="flex items-center gap-3 rounded-[length:var(--pf-radius)] bg-[color:var(--pf-bg-muted)] px-4 py-3 text-sm font-medium text-[color:var(--pf-fg-muted)]"
                        role="status"
                        aria-live="polite"
                      >
                        <Loader2
                          className="shrink-0 animate-spin text-[color:var(--pf-accent)]"
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
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
