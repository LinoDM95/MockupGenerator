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
import { Loader2, LogOut, RefreshCw, Send, Store } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiError } from "../../api/client";
import { fetchTemplateSets } from "../../api/sets";
import {
  etsyCreateBulkJob,
  etsyDisconnect,
  etsyFetchListings,
  etsyGetBulkJob,
  etsyOAuthStart,
  etsyUploadBulkAsset,
  type EtsyListing,
  type EtsyListingImage,
} from "../../api/etsy";
import { useCanvasRender } from "../../hooks/useCanvasRender";
import { toast } from "../../lib/toast";
import { useAppStore } from "../../store/appStore";
import type { Template } from "../../types/mockup";
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
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm"
    >
      <button
        type="button"
        className="touch-manipulation rounded-md px-2 py-1 text-neutral-400 hover:bg-neutral-100"
        aria-label="Reihenfolge ändern"
        {...attributes}
        {...listeners}
      >
        ::
      </button>
      <span className="min-w-0 flex-1 truncate text-sm text-neutral-700">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-sm text-red-600 hover:underline"
      >
        Entfernen
      </button>
    </div>
  );
};

export const EtsyWorkspace = () => {
  const { loadImage } = useCanvasRender();
  const templateSets = useAppStore((s) => s.templateSets);
  const setTemplateSets = useAppStore((s) => s.setTemplateSets);
  const artworks = useAppStore((s) => s.artworks);

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
    void (async () => {
      try {
        const sets = await fetchTemplateSets();
        setTemplateSets(sets);
        if (sets.length && !templateId) {
          const first = sets[0].templates[0];
          if (first) setTemplateId(first.id);
        }
      } catch {
        /* Studio kann leer sein */
      }
    })();
  }, [setTemplateSets, templateId]);

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

  const handleConnect = async () => {
    try {
      const { authorization_url: url } = await etsyOAuthStart();
      window.location.href = url;
    } catch (e) {
      if (e instanceof ApiError) {
        try {
          const j = JSON.parse(e.body) as { detail?: string };
          toast.error(j.detail || `OAuth-Start fehlgeschlagen (HTTP ${e.status}).`);
        } catch {
          toast.error(e.message);
        }
      } else {
        toast.error("OAuth-Start fehlgeschlagen (Konfiguration prüfen).");
      }
    }
  };

  const handleDisconnect = async () => {
    try {
      await etsyDisconnect();
      setListings([]);
      setSelectedListingId(null);
      toast.success("Etsy getrennt.");
    } catch {
      toast.error("Trennen fehlgeschlagen.");
    }
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Store className="text-amber-600" size={28} />
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Etsy</h2>
            <p className="text-sm text-neutral-500">
              Verknüpfen, Listings laden, Bilder löschen und neue Mockups hochladen.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadListings()}
            disabled={listingsLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {listingsLoading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Aktualisieren
          </button>
          <button
            type="button"
            onClick={handleConnect}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Etsy verknüpfen
          </button>
          <button
            type="button"
            onClick={() => void handleDisconnect()}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:bg-white"
          >
            <LogOut size={16} /> Trennen
          </button>
        </div>
      </div>

      {jobId && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700 shadow-sm">
          <span className="font-medium">Letzter Job:</span> {jobId.slice(0, 8)}… —{" "}
          <span className="text-neutral-500">{jobStatus}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-medium text-neutral-900">Listings</h3>
          {listingsLoading && !listings.length ? (
            <p className="text-sm text-neutral-500">Lade…</p>
          ) : listings.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Keine Listings. Zuerst „Etsy verknüpfen“ und Scopes prüfen.
            </p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto text-sm">
              {listings.map((l) => {
                const id = listingId(l);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setSelectedListingId(id)}
                      className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                        selectedListingId === id ? "bg-blue-50 text-blue-900" : "hover:bg-neutral-50"
                      }`}
                    >
                      {l.title || `Listing ${id}`}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-medium text-neutral-900">Listing-Editor</h3>
          {!selectedListing ? (
            <p className="text-sm text-neutral-500">Bitte ein Listing auswählen.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Vorlage</label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
                >
                  {templatesFlat.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Artwork (Generator)</label>
                <select
                  value={artworkId}
                  onChange={(e) => setArtworkId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">— wählen —</option>
                  {artworks.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-neutral-500">Etsy-Bilder löschen</p>
                <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                  {etsyImages.map((im) => {
                    const id = imageId(im);
                    if (!id) return null;
                    const thumb = im.url_75x75 || im.url_570xN || im.url_fullxfull;
                    return (
                      <label
                        key={id}
                        className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-2 text-xs ${
                          deleteIds.has(id) ? "border-red-400 bg-red-50" : "border-neutral-200"
                        }`}
                      >
                        {thumb ? (
                          <img src={thumb} alt="" className="h-14 w-14 rounded object-cover" />
                        ) : (
                          <span className="flex h-14 w-14 items-center justify-center bg-neutral-100">{id}</span>
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
                  {!etsyImages.length && (
                    <span className="text-sm text-neutral-400">Keine Bilder geladen.</span>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-neutral-500">Neue Mockups (Reihenfolge = Rank nach vorhandenen)</p>
                <button
                  type="button"
                  onClick={() => void handleAddMockup()}
                  disabled={busy}
                  className="mb-3 rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                >
                  Mockup erzeugen &amp; hochladen
                </button>
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
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              <button
                type="button"
                onClick={() => void handleSubmitJob()}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                Bulk-Job starten
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
