import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { Children, type ReactNode } from "react";

import { RASTER_IMAGE_ACCEPT_HTML } from "../../../lib/generator/imageUploadAccept";
import { cn } from "../../../lib/ui/cn";
import { resetFileInputOnPick, UPLOAD_QUEUE_INITIAL_DROPZONE_MIN_CLASS } from "../../../lib/generator/uploadQueueUi";
import { Card } from "../primitives/Card";
import { Dropzone } from "./Dropzone";

/** Einheitliches Plus-Icon für alle Upload-Queue-Dropzones. */
export const UploadQueueDefaultIcon = () => (
  <Plus className="h-8 w-8 text-slate-400" strokeWidth={1.5} aria-hidden />
);

type UploadQueueInitialDropzoneProps = {
  title: string;
  description: string;
  accept?: string;
  multiple?: boolean;
  onPickFiles: (files: FileList | null) => void;
  icon?: ReactNode;
  className?: string;
};

/**
 * Erste große Dropzone (Leerzustand) — gleiche Typo/Mindesthöhe wie überall im Workspace.
 */
export const UploadQueueInitialDropzone = ({
  title,
  description,
  accept = RASTER_IMAGE_ACCEPT_HTML,
  multiple = true,
  onPickFiles,
  icon,
  className,
}: UploadQueueInitialDropzoneProps) => (
  <Dropzone
    title={title}
    description={description}
    icon={icon ?? <UploadQueueDefaultIcon />}
    accept={accept}
    multiple={multiple}
    onPickFiles={onPickFiles}
    onChange={(e) => resetFileInputOnPick(e, onPickFiles)}
    className={cn(UPLOAD_QUEUE_INITIAL_DROPZONE_MIN_CLASS, className)}
  />
);

type UploadQueueGridProps = {
  /** z. B. „Motive“ / „Bilder“ */
  label: string;
  dropzoneTitle: string;
  dropzoneDescription?: string;
  /** Standard: Raster (Upscaler); Generator übergibt z. B. `GENERATOR_IMAGE_ACCEPT_HTML`. */
  accept?: string;
  multiple?: boolean;
  onPickFiles: (files: FileList | null) => void;
  /** Optional: Standard ist {@link UploadQueueDefaultIcon} */
  dropzoneIcon?: ReactNode;
  children: ReactNode;
};

/**
 * Gemeinsames Raster für Generator & Upscaler: erste Zelle Dropzone (fullCard),
 * danach animierte Karten — Layout und Typo sind zentral gebunden.
 */
export const UploadQueueGrid = ({
  label,
  dropzoneTitle,
  dropzoneDescription = "Ziehen oder klicken",
  accept = RASTER_IMAGE_ACCEPT_HTML,
  multiple = true,
  onPickFiles,
  dropzoneIcon,
  children,
}: UploadQueueGridProps) => {
  const hasQueueItems = Children.toArray(children).length > 0;

  return (
    <div className="min-w-0">
      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <div
        className={cn(
          "grid grid-cols-1 gap-4",
          hasQueueItems && "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-col",
            hasQueueItems
              ? "h-full min-h-[18rem] sm:min-h-0"
              : "min-h-[min(28rem,55vh)] w-full flex-1",
          )}
        >
          <Dropzone
            fullCard
            bareSurface={!hasQueueItems}
            title={dropzoneTitle}
            description={dropzoneDescription}
            icon={dropzoneIcon ?? <UploadQueueDefaultIcon />}
            accept={accept}
            multiple={multiple}
            onPickFiles={onPickFiles}
            onChange={(e) => resetFileInputOnPick(e, onPickFiles)}
            className={cn(
              "h-full min-h-0 flex-1",
              !hasQueueItems && "min-h-[min(28rem,55vh)]",
            )}
          />
        </div>
        <AnimatePresence initial={false} mode="popLayout">
          {children}
        </AnimatePresence>
      </div>
    </div>
  );
};

export const UploadQueueMotionItem = ({
  children,
}: {
  children: ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
);

export const UploadQueueCard = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <Card
    padding="sm"
    className={cn("group flex h-full flex-col", className)}
  >
    {children}
  </Card>
);

export const UploadQueueCardMedia = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "relative aspect-square overflow-hidden rounded-xl bg-slate-100 ring-1 ring-inset ring-slate-900/5",
      className,
    )}
  >
    {children}
  </div>
);

export const UploadQueueCardFooter = ({
  children,
}: {
  children: ReactNode;
}) => <div className="mt-3 min-w-0 flex-1">{children}</div>;

export const UploadQueueCardRemoveButton = ({
  onClick,
  ariaLabel,
}: {
  onClick: () => void;
  ariaLabel: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-400 opacity-0 shadow-sm ring-1 ring-slate-900/5 transition-all hover:text-red-600 group-hover:opacity-100"
    aria-label={ariaLabel}
  >
    <X size={16} strokeWidth={2} aria-hidden />
  </button>
);

export const UploadQueueCardIndexBadge = ({ index }: { index: number }) => (
  <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-900/10">
    {index + 1}
  </span>
);
