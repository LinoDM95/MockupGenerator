export type ElementType =
  | "placeholder"
  | "text"
  | "rect"
  | "circle"
  | "triangle"
  | "star"
  | "hexagon";

export type FrameStyle = "none" | "black" | "white" | "wood";

export interface TemplateElement {
  id: string;
  type: ElementType;
  name?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  textCurve?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
}

export interface Template {
  id: string;
  name: string;
  width: number;
  height: number;
  bgImage: string;
  elements: TemplateElement[];
  order?: number;
  /** Rahmen für Mockup-Export (Generator/Etsy); nur im Vorlagen-Editor wählbar. */
  defaultFrameStyle: FrameStyle;
  /** Außenschatten am Rahmen (kombinierbar mit Innen). */
  frameShadowOuterEnabled?: boolean;
  /** Innenschatten / Tiefe ins Motiv. */
  frameShadowInnerEnabled?: boolean;
  /** Seiten-Bits Außen: 1 oben, 2 rechts, 4 unten, 8 links (15 = alle). */
  frameOuterSides?: number;
  /** Seiten-Bits Innen (15 = alle). */
  frameInnerSides?: number;
  /** Stärke/Tiefe 0.15–1 für aktive Schatten. */
  frameShadowDepth?: number;
  /** Motiv-Sättigung im Export (1 = Original, niedriger = dezenter zum Hintergrund). */
  artworkSaturation?: number;
}

export interface TemplateSet {
  id: string;
  name: string;
  templates: Template[];
}

export interface ArtworkItem {
  id: string;
  file: File;
  /** Volle Auflösung (Blob-URL) – Export / Canvas. */
  url: string;
  /** Kleines JPEG-Object-URL nur für Listen-Thumbnails (z. B. max. 256px Kante); Export nutzt `file`/`url`. */
  previewUrl?: string;
  name: string;
  setId: string;
}
