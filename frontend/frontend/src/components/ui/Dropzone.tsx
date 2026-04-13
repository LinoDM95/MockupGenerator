import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";

import { cn } from "../../lib/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "title"> & {
  title: ReactNode;
  description?: string;
  icon?: ReactNode;
  className?: string;
  /** Wird bei Drag-and-Drop aufgerufen (zusätzlich zum nativen Input). */
  onPickFiles?: (files: FileList | null) => void;
};

export const Dropzone = ({
  title,
  description,
  icon,
  className,
  id,
  onPickFiles,
  ...inputProps
}: Props) => {
  const uid = useId().replace(/:/g, "");
  const fid = id ?? (typeof inputProps.name === "string" && inputProps.name ? inputProps.name : `file-${uid}`);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const list = e.dataTransfer.files;
    if (list?.length) onPickFiles?.(list);
  };

  return (
    <label
      htmlFor={fid}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-white px-4 py-8 transition-colors hover:bg-neutral-50",
        className,
      )}
    >
      {icon}
      <div className="mt-2 text-center text-sm text-neutral-600">{title}</div>
      {description ? (
        <p className="mt-1 max-w-md px-4 text-center text-xs text-neutral-400">{description}</p>
      ) : null}
      {/* type="file" muss gesetzt sein — ohne type ist das Input ein Textfeld und .files bleibt leer. */}
      <input id={fid} className="sr-only" {...inputProps} type="file" />
    </label>
  );
};
