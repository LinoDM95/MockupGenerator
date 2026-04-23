import { ImageOff, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { renderTemplateToCanvas } from "../../lib/canvas/renderTemplate";
import { releaseCanvas } from "../../lib/canvas/image";
import { templateSetHasTemplates } from "../../lib/generator/generatorZipReadiness";
import { cn } from "../../lib/ui/cn";
import { WORKSPACE_ZINC_MUTED } from "../../lib/ui/workspaceSurfaces";
import type { ArtworkItem, Template, TemplateSet } from "../../types/mockup";

const DEBOUNCE_MS = 320;
const THUMB_MAX_EDGE = 200;
const CONCURRENCY = 2;

type LoadImageFn = (src: string) => Promise<HTMLImageElement>;

const scaleCanvasToMaxEdge = (
  source: HTMLCanvasElement,
  maxEdge: number,
): HTMLCanvasElement => {
  const w = source.width;
  const h = source.height;
  const scale = Math.min(1, maxEdge / Math.max(w, h, 1));
  const tw = Math.round(w * scale);
  const th = Math.round(h * scale);
  const c = document.createElement("canvas");
  c.width = tw;
  c.height = th;
  const ctx = c.getContext("2d");
  if (!ctx) return source;
  ctx.drawImage(source, 0, 0, tw, th);
  return c;
};

const sortTemplates = (templates: Template[]): Template[] =>
  [...templates].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

type PreviewCell =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error" };

type Props = {
  artwork: ArtworkItem | null;
  templateSet: TemplateSet | undefined;
  templateSets: TemplateSet[];
  loadImageFn: LoadImageFn;
  className?: string;
};

export const GeneratorMockupPreviewGrid = ({
  artwork,
  templateSet,
  templateSets,
  loadImageFn,
  className,
}: Props) => {
  const [cells, setCells] = useState<Record<string, PreviewCell>>({});
  const urlsToRevokeRef = useRef<string[]>([]);

  useEffect(() => {
    const revokeQueued = () => {
      urlsToRevokeRef.current.forEach((u) => URL.revokeObjectURL(u));
      urlsToRevokeRef.current = [];
    };

    let cancelled = false;

    const timer = window.setTimeout(() => {
      revokeQueued();
      setCells({});

      if (
        !artwork ||
        !templateSet ||
        !templateSetHasTemplates(artwork.setId, templateSets)
      ) {
        return;
      }

      const templates = sortTemplates(templateSet.templates);
      if (templates.length === 0) return;

      const initial: Record<string, PreviewCell> = {};
      for (const tpl of templates) initial[tpl.id] = { status: "loading" };
      setCells(initial);

      const artSrc = artwork.previewUrl?.trim() ? artwork.previewUrl : artwork.url;

      const runPool = async () => {
        let artImg: HTMLImageElement;
        try {
          artImg = await loadImageFn(artSrc);
        } catch {
          if (!cancelled) {
            const errCells: Record<string, PreviewCell> = {};
            for (const tpl of templates) errCells[tpl.id] = { status: "error" };
            setCells(errCells);
          }
          return;
        }

        if (cancelled) return;

        let nextIndex = 0;

        const worker = async () => {
          while (!cancelled && nextIndex < templates.length) {
            const i = nextIndex;
            nextIndex += 1;
            const tpl = templates[i];
            try {
              const canvas = await renderTemplateToCanvas(tpl, artImg, loadImageFn);
              const thumb = scaleCanvasToMaxEdge(canvas, THUMB_MAX_EDGE);
              releaseCanvas(canvas);
              const blob = await new Promise<Blob>((resolve, reject) => {
                thumb.toBlob(
                  (b) => (b ? resolve(b) : reject(new Error("toBlob"))),
                  "image/jpeg",
                  0.82,
                );
              });
              releaseCanvas(thumb);
              if (cancelled) return;
              const url = URL.createObjectURL(blob);
              urlsToRevokeRef.current.push(url);
              setCells((prev) => ({
                ...prev,
                [tpl.id]: { status: "ready", url },
              }));
            } catch {
              if (!cancelled) {
                setCells((prev) => ({
                  ...prev,
                  [tpl.id]: { status: "error" },
                }));
              }
            }
          }
        };

        await Promise.all(
          Array.from({ length: Math.min(CONCURRENCY, templates.length) }, () =>
            worker(),
          ),
        );
      };

      void runPool();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      revokeQueued();
    };
  }, [
    artwork?.id,
    artwork?.setId,
    artwork?.url,
    artwork?.previewUrl,
    templateSet?.id,
    loadImageFn,
    templateSets,
  ]);

  if (!artwork) {
    return (
      <div
        className={cn(
          "flex min-h-[12rem] items-center justify-center p-6 text-center text-sm font-medium",
          WORKSPACE_ZINC_MUTED,
          className,
        )}
      >
        Wähle links ein Motiv, um Mockup-Vorschauen zu sehen.
      </div>
    );
  }

  if (!templateSetHasTemplates(artwork.setId, templateSets) || !templateSet) {
    return (
      <div
        className={cn(
          "flex min-h-[12rem] items-center justify-center p-6 text-center text-sm font-medium",
          WORKSPACE_ZINC_MUTED,
          className,
        )}
      >
        Bitte ein Vorlagen-Set mit mindestens einer Vorlage für dieses Motiv wählen.
      </div>
    );
  }

  const templates = sortTemplates(templateSet.templates);

  if (templates.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[12rem] items-center justify-center p-6 text-center text-sm font-medium",
          WORKSPACE_ZINC_MUTED,
          className,
        )}
      >
        Dieses Set enthält noch keine Vorlagen.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {templates.map((tpl) => {
        const cell = cells[tpl.id];
        const status = cell?.status ?? "loading";
        return (
          <div
            key={tpl.id}
            className="flex flex-col overflow-hidden rounded-[length:var(--pf-radius)] border border-[color:var(--pf-border)] bg-[color:var(--pf-bg-elevated)] shadow-[var(--pf-shadow-sm)]"
          >
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-[color:var(--pf-bg-muted)]">
              {status === "ready" && cell && cell.status === "ready" ? (
                <img
                  src={cell.url}
                  alt={`Vorschau ${tpl.name}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : null}
              {status === "loading" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--pf-bg-muted)]/95">
                  <Loader2 className="h-8 w-8 animate-spin text-[color:var(--pf-fg-faint)]" aria-hidden />
                  <span className="sr-only">Vorschau wird berechnet</span>
                </div>
              ) : null}
              {status === "error" ? (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-100/90 p-3 text-center dark:bg-zinc-900/90"
                  role="status"
                >
                  <ImageOff className="h-7 w-7 text-[color:var(--pf-fg-faint)]" aria-hidden />
                  <span className="text-xs font-medium text-[color:var(--pf-fg-muted)]">
                    Vorschau nicht möglich
                  </span>
                </div>
              ) : null}
            </div>
            <p className="truncate border-t border-[color:var(--pf-border-subtle)] px-2.5 py-2 text-xs font-medium text-[color:var(--pf-fg)]">
              {tpl.name}
            </p>
          </div>
        );
      })}
    </div>
  );
};
