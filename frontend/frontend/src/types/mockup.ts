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
}

export interface TemplateSet {
  id: string;
  name: string;
  templates: Template[];
}

export interface ArtworkItem {
  id: string;
  file: File;
  url: string;
  name: string;
  setId: string;
  frameStyle: FrameStyle;
}
