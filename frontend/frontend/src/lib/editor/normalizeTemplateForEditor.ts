import { getTemplateRenderOpts } from "../canvas/renderOpts";
import type { Template, TemplateElement } from "../../types/mockup";

/**
 * Bringt API- bzw. Import-Daten auf das aktuelle Editor-Schema
 * (Legacy: `placeholders` → `elements`, Default-Felder).
 */
export const normalizeTemplateForEditor = (tpl: Template): Template => {
  let elements = tpl.elements;
  if (!elements?.length && (tpl as unknown as { placeholders?: TemplateElement[] }).placeholders) {
    elements = ((tpl as unknown as { placeholders: TemplateElement[] }).placeholders || []).map(
      (ph) => ({ ...ph, type: "placeholder" as const }),
    );
  }
  elements = (elements || []).map((el) => ({
    ...el,
    rotation: el.rotation ?? 0,
    shadowEnabled: el.shadowEnabled ?? false,
    shadowColor: el.shadowColor ?? "rgba(0,0,0,0.5)",
    shadowBlur: el.shadowBlur ?? 20,
    shadowOffsetX: el.shadowOffsetX ?? 10,
    shadowOffsetY: el.shadowOffsetY ?? 10,
    textCurve: el.textCurve ?? 0,
  }));
  const { frameStyle: defaultFrameStyle, ...frameOpts } = getTemplateRenderOpts(tpl);
  return {
    ...tpl,
    elements,
    defaultFrameStyle,
    ...frameOpts,
  };
};
