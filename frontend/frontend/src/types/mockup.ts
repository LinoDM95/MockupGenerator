export type ElementType =
  | "placeholder"
  | "text"
  | "rect"
  | "circle"
  | "triangle"
  | "star"
  | "hexagon";

export type FrameStyle = "none" | "black" | "white" | "wood";

/** Rechteck (Standard) oder Viereck mit Perspektive — Ecken TL, TR, BR, BL in Template-Pixeln. */
export type PlaceholderShape = "rect" | "quad";

export type QuadCornerPoint = { x: number; y: number };

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
  /** Nur Platzhalter: `quad` = vier freie Ecken für Perspektive; `rect` oder fehlend = klassisch x,y,w,h (+ Rotation). */
  placeholderShape?: PlaceholderShape;
  /** TL, TR, BR, BL in Template-Koordinaten (bei `placeholderShape === "quad"`). */
  quadCorners?: [QuadCornerPoint, QuadCornerPoint, QuadCornerPoint, QuadCornerPoint];
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
  /** Realistische Stoff-/Faltenverformung des Motivs via WebGL aktiv. */
  foldsEnabled?: boolean;
  /** Verschiebungsstärke entlang der Sobel-Normalen (0–1, default 0.4). */
  foldStrength?: number;
  /** Schattentiefe aus Hintergrund-Luminanz (0–1, default 0.6). */
  foldShadowDepth?: number;
  /** Additive Glanzlichter an Faltenkämmen (0–1, default 0.25). */
  foldHighlightStrength?: number;
  /** Pre-Smoothing-Radius in Pixeln vor Sobel (1–32, default 4). */
  foldSmoothing?: number;
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
