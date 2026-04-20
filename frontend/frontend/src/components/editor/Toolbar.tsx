import { Circle, Crosshair, Hexagon, Image as ImageIcon, Square, Star, Triangle, Type } from "lucide-react";

import { cn } from "../../lib/ui/cn";
import { Button } from "../ui/primitives/Button";
import type { ElementType } from "../../types/mockup";

type Props = {
  isDrawMode: boolean;
  onToggleDrawMode: () => void;
  onAddElement: (t: ElementType) => void;
  disabled?: boolean;
  /** `bar`: horizontale Leiste (Standard). `panel`: gestapelt im linken Einstellungs-Panel. */
  layout?: "bar" | "panel";
};

export const Toolbar = ({
  isDrawMode,
  onToggleDrawMode,
  onAddElement,
  disabled = false,
  layout = "bar",
}: Props) => {
  const isPanel = layout === "panel";
  const btnClass = cn("text-sm", isPanel && "w-full justify-start gap-2 font-medium tracking-normal");
  return (
    <div
      className={cn(
        isPanel
          ? "flex flex-col gap-2"
          : "mb-4 flex flex-wrap items-center gap-2 overflow-x-auto rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-900/5",
        disabled && "pointer-events-none opacity-45",
      )}
      aria-disabled={disabled || undefined}
    >
      {isPanel ? (
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Hinzufügen</p>
      ) : (
        <span className="mr-1 flex items-center border-r border-slate-300 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Hinzufügen
        </span>
      )}
      <Button variant="outline" className={btnClass} type="button" onClick={() => onAddElement("placeholder")}>
        <ImageIcon size={15} strokeWidth={1.75} /> Motiv Box
      </Button>
      <Button
        variant={isDrawMode ? "primary" : "outline"}
        className={cn(
          btnClass,
          !isDrawMode && "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
        )}
        type="button"
        onClick={onToggleDrawMode}
      >
        <Crosshair size={15} strokeWidth={1.75} /> {isDrawMode ? "Zeichnen abbrechen" : "Motiv zeichnen (4-Klick)"}
      </Button>
      <div className={cn(isPanel ? "my-1 border-t border-slate-200/90" : "mx-1 h-5 w-px bg-slate-200")} />
      <Button variant="outline" className={btnClass} type="button" onClick={() => onAddElement("text")}>
        <Type size={15} strokeWidth={1.75} /> Text
      </Button>
      <Button variant="outline" className={btnClass} type="button" onClick={() => onAddElement("rect")}>
        <Square size={15} strokeWidth={1.75} /> Rechteck
      </Button>
      <Button variant="outline" className={btnClass} type="button" onClick={() => onAddElement("circle")}>
        <Circle size={15} strokeWidth={1.75} /> Kreis
      </Button>
      <Button variant="outline" className={btnClass} type="button" onClick={() => onAddElement("triangle")}>
        <Triangle size={15} strokeWidth={1.75} /> Dreieck
      </Button>
      <Button variant="outline" className={btnClass} type="button" onClick={() => onAddElement("star")}>
        <Star size={15} strokeWidth={1.75} /> Stern
      </Button>
      <Button variant="outline" className={btnClass} type="button" onClick={() => onAddElement("hexagon")}>
        <Hexagon size={15} strokeWidth={1.75} /> Hexagon
      </Button>
    </div>
  );
};
