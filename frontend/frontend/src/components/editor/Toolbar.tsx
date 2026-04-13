import { Circle, Crosshair, Hexagon, Image as ImageIcon, Square, Star, Triangle, Type } from "lucide-react";

import { Button } from "../ui/Button";
import type { ElementType } from "../../types/mockup";

type Props = {
  isDrawMode: boolean;
  onToggleDrawMode: () => void;
  onAddElement: (t: ElementType) => void;
  /** z. B. Endansicht-Vorschau: Werkzeuge ausblenden. */
  disabled?: boolean;
};

export const Toolbar = ({ isDrawMode, onToggleDrawMode, onAddElement, disabled = false }: Props) => (
  <div
    className={`mb-4 flex flex-wrap items-center gap-2 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-100 p-2 ${
      disabled ? "pointer-events-none opacity-45" : ""
    }`}
    aria-disabled={disabled || undefined}
  >
    <span className="mr-1 flex items-center border-r border-neutral-300 px-2 text-xs font-bold uppercase text-neutral-400">
      Hinzufügen
    </span>
    <Button variant="outline" className="text-sm" type="button" onClick={() => onAddElement("placeholder")}>
      <ImageIcon size={16} /> Motiv Box
    </Button>
    <Button
      variant={isDrawMode ? "primary" : "outline"}
      className={`text-sm ${isDrawMode ? "" : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
      type="button"
      onClick={onToggleDrawMode}
    >
      <Crosshair size={16} /> {isDrawMode ? "Zeichnen abbrechen" : "Motiv zeichnen (4-Klick)"}
    </Button>
    <div className="mx-1 h-5 w-px bg-neutral-300" />
    <Button variant="outline" className="text-sm" type="button" onClick={() => onAddElement("text")}>
      <Type size={16} /> Text
    </Button>
    <Button variant="outline" className="text-sm" type="button" onClick={() => onAddElement("rect")}>
      <Square size={16} /> Rechteck
    </Button>
    <Button variant="outline" className="text-sm" type="button" onClick={() => onAddElement("circle")}>
      <Circle size={16} /> Kreis
    </Button>
    <Button variant="outline" className="text-sm" type="button" onClick={() => onAddElement("triangle")}>
      <Triangle size={16} /> Dreieck
    </Button>
    <Button variant="outline" className="text-sm" type="button" onClick={() => onAddElement("star")}>
      <Star size={16} /> Stern
    </Button>
    <Button variant="outline" className="text-sm" type="button" onClick={() => onAddElement("hexagon")}>
      <Hexagon size={16} /> Hexagon
    </Button>
  </div>
);
