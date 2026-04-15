import { motion } from "framer-motion";
import type { InputHTMLAttributes, ReactNode } from "react";
import { useId, useRef, useState } from "react";

import { cn } from "../../lib/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "title"> & {
  title: ReactNode;
  description?: string;
  icon?: ReactNode;
  className?: string;
  onPickFiles?: (files: FileList | null) => void;
  /** Nur bei Datei-Upload per Drag & Drop (nicht beim Dateiauswahl-Dialog). */
  onDropComplete?: () => void;
};

export const Dropzone = ({
  title,
  description,
  icon,
  className,
  id,
  onPickFiles,
  onDropComplete,
  ...inputProps
}: Props) => {
  const uid = useId().replace(/:/g, "");
  const fid = id ?? (typeof inputProps.name === "string" && inputProps.name ? inputProps.name : `file-${uid}`);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setIsDragging(false);
    const list = e.dataTransfer.files;
    if (list?.length) {
      onPickFiles?.(list);
      onDropComplete?.();
    }
  };

  return (
    <label
      htmlFor={fid}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition-[background-color,border-color,box-shadow] duration-200 ease-out",
        isDragging
          ? "border-indigo-500 bg-indigo-50/90 shadow-sm ring-2 ring-indigo-200/60 hover:border-indigo-500 hover:bg-indigo-50/90"
          : "border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-slate-100",
        className,
      )}
    >
      <motion.span
        className="inline-flex shrink-0"
        animate={{ scale: isDragging ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
      >
        {icon}
      </motion.span>
      <div className="mt-2 text-center text-sm text-slate-600">{title}</div>
      {description ? (
        <p className="mt-1 max-w-md px-4 text-center text-xs text-slate-400">{description}</p>
      ) : null}
      <input id={fid} className="sr-only" {...inputProps} type="file" />
    </label>
  );
};
