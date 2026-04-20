import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { GripVertical, Loader2, RefreshCw, Send, Store } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useIntegrationFlags } from "../../hooks/useIntegrationFlags";
import { useLoadTemplateSets } from "../../hooks/useLoadTemplateSets";
import {
  etsyCreateBulkJob,
  etsyFetchListings,
  etsyGetBulkJob,
  etsyUploadBulkAsset,
  type EtsyListing,
  type EtsyListingImage,
} from "../../api/etsy";
import { useCanvasRender } from "../../hooks/useCanvasRender";
import { cn } from "../../lib/ui/cn";
import { toast } from "../../lib/ui/toast";
import { useAppStore } from "../../store/appStore";
import type { Template } from "../../types/mockup";
import { AppPageSectionHeader } from "../ui/layout/AppPageSectionHeader";
import { Button } from "../ui/primitives/Button";
import { Card } from "../ui/primitives/Card";
import { EmptyState } from "../ui/layout/EmptyState";
import { IntegrationMissingCallout } from "../ui/patterns/IntegrationMissingCallout";
import { Select } from "../ui/primitives/Select";
import { renderTemplateToPngBlob } from "./mockupExport";

type NewSlot = { key: string; assetId: string };

const listingId = (l: EtsyListing) => Number(l.listing_id ?? l.listingId ?? 0);
const imageId = (img: EtsyListingImage) => Number(img.listing_image_id ?? img.listingImageId ?? 0);
const imageRank = (img: EtsyListingImage) => Number(img.rank ?? 0);

const SortableSlotRow = ({
  id,
  label,
  onRemove,
}: {
  id: string;
  label: string;
  onRemove: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={false}
      exit={{
        opacity: 0,
        height: 0,
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
      }}
      transition={{ duration: 0.2, layout: { duration: 0.2, ease: "easeOut" } }}
      className="flex items-center gap-3 overflow-hidden rounded-xl bg-white px-3 py-2.5 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5"
    >
      <button
        type="button"
        className="touch-manipulation rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        aria-label="Reihenfolge ändern"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} strokeWidth={1.75} />
      </button>
      <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-sm text-red-500 transition-colors hover:text-red-700"
      >
        Entfernen
      </button>
    </motion.div>
  );
};

/**
 * Listings + Listing-Editor + Bulk-Jobs — Arbeitsbereich.
 * OAuth / Trennen: {@link EtsyIntegrationSetup} unter Integrationen.
 */
export const EtsyListingsEditor = () => {
  const { loadImage } = useCanvasRender();
  const templateSets = useAppStore((s) => s.templateSets);
  const artworks = useAppStore((s) => s.artworks);
  const goToIntegration = useAppStore((s) => s.goToIntegration);
  const { etsy: etsyConnected, loading: integrationFlagsLoading } = useIntegrationFlags();
  useLoadTemplateSets({ silent: true });

  const [listings, setListings] = useState<EtsyListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null);
  const [templateId, setTemplateId] = useState<string>("");
  const [artworkId, setArtworkId] = useState<string>("");
  const [deleteIds, setDeleteIds] = useState<Set<number>>(new Set());
  const [newSlots, setNewSlots] = useState<NewSlot[]>([]);
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const selectedListing = useMemo(
    () => listings.find((l) => listingId(l) === selectedListingId) ?? null,
    [listings, selectedListingId],
  );

  const templatesFlat = useMemo(() => {
    const out: Template[] = [];
    for (const s of templateSets) for (const t of s.templates) out.push(t);
    return out;
  }, [templateSets]);

  const activeTemplate = templatesFlat.find((t) => t.id === templateId) ?? null;
  const activeArtwork = artworks.find((a) => a.id === artworkId) ?? null;

  const loadListings = useCallback(async () => {
    setListingsLoading(true);
    try {
      const data = await etsyFetchListings({ limit: 50, offset: 0 });
      const rows = data.results || [];
      setListings(rows);
      setSelectedListingId((cur) => {
        if (cur != null && rows.some((l) => listingId(l) === cur)) return cur;
        return rows.length ? listingId(rows[0]) : null;
      });
    } catch {
      setListings([]);
      toast.error("Listings konnten nicht geladen werden (Etsy verbunden?).");
    } finally {
      setListingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (templateSets.length && !templateId) {
      const first = templateSets[0].templates[0];
      if (first) setTemplateId(first.id);
    }
  }, [templateSets, templateId]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  useEffect(() => {
    setDeleteIds(new Set());
    setNewSlots([]);
  }, [selectedListingId]);

  const toggleDelete = (id: number) => {
    setDeleteIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleAddMockup = async () => {
    if (!activeTemplate || !activeArtwork) {
      toast.error("Vorlage und Artwork wählen (oder im Generator Artworks laden).");
      return;
    }
    setBusy(true);
    try {
      const blob = await renderTemplateToPngBlob(activeTemplate, activeArtwork.url, loadImage);
      const { id } = await etsyUploadBulkAsset(blob, `${activeArtwork.name || "mockup"}.png`);
      setNewSlots((s) => [...s, { key: `n_${Date.now()}`, assetId: id }]);
      toast.success("Mockup hochgeladen.");
    } catch (e) {
      console.error(e);
      toast.error("Generieren oder Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = newSlots.findIndex((x) => x.key === String(active.id));
    const newIndex = newSlots.findIndex((x) => x.key === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setNewSlots((items) => arrayMove(items, oldIndex, newIndex));
  };

  const computeUploadRanks = () => {
    if (!selectedListing) return [];
    const imgs = selectedListing.images || [];
    const kept = imgs.filter((im) => {
      const id = imageId(im);
      return id && !deleteIds.has(id);
    });
    const maxKept = kept.reduce((m, im) => Math.max(m, imageRank(im)), 0);
    return newSlots.map((slot, i) => ({
      asset_id: slot.assetId,
      rank: maxKept + i + 1,
    }));
  };

  const handleSubmitJob = async () => {
    if (!selectedListingId) {
      toast.error("Listing wählen.");
      return;
    }
    const dels = Array.from(deleteIds);
    const uploads = computeUploadRanks();
    if (!dels.length && !uploads.length) {
      toast.error("Mindestens ein Bild zum Löschen oder ein neues Mockup.");
      return;
    }
    setBusy(true);
    try {
      const job = await etsyCreateBulkJob({
        items: [{ listing_id: selectedListingId, deletes: dels, uploads }],
      });
      setJobId(job.id);
      setJobStatus(job.status);
      toast.success("Job gestartet.");
    } catch (e) {
      console.error(e);
      toast.error("Job konnte nicht gestartet werden.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;
    let stop = false;
    const tick = async () => {
      try {
        const j = await etsyGetBulkJob(jobId);
        if (stop) return;
        setJobStatus(j.status);
        if (["success", "failed", "partial"].includes(j.status)) {
          stop = true;
          if (j.status === "success") toast.success("Etsy-Job abgeschlossen.");
          else if (j.status === "partial") toast.info("Job teilweise erfolgreich — Details siehe Status.");
          else toast.error("Job fehlgeschlagen.");
        }
      } catch {
        /* ignore */
      }
    };
    void tick();
    const iv = window.setInterval(() => void tick(), 2000);
    return () => {
      stop = true;
      window.clearInterval(iv);
    };
  }, [jobId]);

  const etsyImages = selectedListing?.images || [];

  const primaryListingImageUrl = useMemo(() => {
    if (!etsyImages.length) return null;
    const sorted = [...etsyImages].sort((a, b) => imageRank(a) - imageRank(b));
    const first = sorted[0];
    return first?.url_570xN || first?.url_fullxfull || first?.url_75x75 || null;
  }, [etsyImages]);

  return (
    <div className="space-y-8">
      <AppPageSectionHeader
        icon={Store}
        title="Etsy Listings"
        description="Vorschau, Bilder verwalten und Mockups per Bulk-Job senden."
      />

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          variant="outline"
          type="button"
          onClick={() => void loadListings()}
          disabled={listingsLoading}
        >
          {listingsLoading ? (
            <Loader2 className="animate-spin" size={16} aria-hidden />
          ) : (
            <RefreshCw size={16} strokeWidth={1.75} aria-hidden />
          )}
          Aktualisieren
        </Button>
      </div>

      {!integrationFlagsLoading && !etsyConnected ? (
        <IntegrationMissingCallout
          title="Etsy ist nicht verbunden"
          description="Verknüpfe deinen Etsy-Shop unter Integrationen, um Listings zu laden und Mockups per Bulk-Job hochzuladen."
          actionLabel="Etsy einrichten"
          onSetup={() => goToIntegration("etsy")}
        />
      ) : null}

      {jobId ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-inset ring-slate-900/5">
          <span className="font-bold text-slate-900">Letzter Job:</span> {jobId.slice(0, 8)}… —{" "}
          <span className="text-indigo-700">{jobStatus}</span>
        </div>
      ) : null}

      {listingsLoading && !listings.length ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-medium text-slate-500">
          <Loader2 className="animate-spin" size={18} aria-hidden />
          Listings werden geladen…
        </div>
      ) : listings.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Keine Listings"
          desc="Verbinde deinen Etsy-Shop oder aktualisiere die Liste, sobald dein Shop Listings enthält."
          action={
            <Button type="button" variant="outline" onClick={() => goToIntegration("etsy")}>
              Unter Integrationen verbinden
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="space-y-4 lg:sticky lg:top-24">
              <Card padding="sm">
                <div className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-900/5">
                  {primaryListingImageUrl ? (
                    <img
                      src={primaryListingImageUrl}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">
                      Kein Bild
                    </div>
                  )}
                </div>
                <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Vorschau Hauptbild
                </p>
              </Card>
              {etsyImages.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {etsyImages.slice(0, 8).map((im) => {
                    const id = imageId(im);
                    if (!id) return null;
                    const thumb = im.url_75x75 || im.url_570xN || im.url_fullxfull;
                    return (
                      <div
                        key={id}
                        className="aspect-square overflow-hidden rounded-lg bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/10"
                      >
                        {thumb ? (
                          <img src={thumb} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                            {id}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-7">
            <Card padding="lg">
              <div className="space-y-6">
                <Select
                  label="Listing"
                  value={selectedListingId != null ? String(selectedListingId) : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedListingId(v ? Number(v) : null);
                  }}
                >
                  <option value="">— wählen —</option>
                  {listings.map((l) => {
                    const id = listingId(l);
                    return (
                      <option key={id} value={id}>
                        {l.title || `Listing ${id}`}
                      </option>
                    );
                  })}
                </Select>

                {!selectedListing ? (
                  <p className="py-6 text-center text-sm font-medium text-slate-500">
                    Bitte ein Listing auswählen.
                  </p>
                ) : (
                  <>
                    <Select
                      label="Vorlage"
                      value={templateId}
                      onChange={(e) => setTemplateId(e.target.value)}
                    >
                      {templatesFlat.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </Select>

                    <Select
                      label="Artwork (Generator)"
                      value={artworkId}
                      onChange={(e) => setArtworkId(e.target.value)}
                    >
                      <option value="">— wählen —</option>
                      {artworks.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </Select>

                    <div className="border-t border-slate-100 pt-6">
                      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-700">
                        Etsy-Bilder entfernen
                      </p>
                      <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                        {etsyImages.map((im) => {
                          const id = imageId(im);
                          if (!id) return null;
                          const thumb = im.url_75x75 || im.url_570xN || im.url_fullxfull;
                          return (
                            <label
                              key={id}
                              className={cn(
                                "flex cursor-pointer flex-col items-center gap-1 rounded-xl p-2 text-xs font-medium transition-colors shadow-[0_2px_8px_rgb(0,0,0,0.04)]",
                                deleteIds.has(id)
                                  ? "bg-red-50 text-red-800 ring-1 ring-inset ring-red-500/20"
                                  : "bg-white text-slate-600 ring-1 ring-slate-900/5 hover:bg-slate-50",
                              )}
                            >
                              {thumb ? (
                                <img src={thumb} alt="" className="h-14 w-14 rounded-lg object-cover" />
                              ) : (
                                <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                                  {id}
                                </span>
                              )}
                              <input
                                type="checkbox"
                                checked={deleteIds.has(id)}
                                onChange={() => toggleDelete(id)}
                                className="sr-only"
                              />
                              löschen
                            </label>
                          );
                        })}
                        {!etsyImages.length ? (
                          <span className="text-sm font-medium text-slate-400">Keine Bilder geladen.</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-700">
                        Neue Mockups (Reihenfolge = Rank nach vorhandenen)
                      </p>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => void handleAddMockup()}
                        disabled={busy}
                        className="mb-3"
                      >
                        Mockup erzeugen &amp; hochladen
                      </Button>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={newSlots.map((s) => s.key)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            <AnimatePresence initial={false} mode="popLayout">
                              {newSlots.map((s, i) => (
                                <SortableSlotRow
                                  key={s.key}
                                  id={s.key}
                                  label={`#${i + 1} — ${s.assetId.slice(0, 8)}…`}
                                  onRemove={() =>
                                    setNewSlots((prev) => prev.filter((x) => x.key !== s.key))
                                  }
                                />
                              ))}
                            </AnimatePresence>
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>

                    <div className="flex justify-end border-t border-slate-100 pt-6">
                      <Button
                        type="button"
                        onClick={() => void handleSubmitJob()}
                        disabled={busy}
                        className="min-w-[200px] gap-2 px-8"
                      >
                        {busy ? (
                          <Loader2 className="animate-spin" size={16} aria-hidden />
                        ) : (
                          <Send size={16} strokeWidth={1.75} aria-hidden />
                        )}
                        Bulk-Job starten
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
