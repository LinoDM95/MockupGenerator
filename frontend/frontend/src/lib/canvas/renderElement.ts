import type { FrameStyle, TemplateElement } from "../../types/mockup";
import { FRAME_SHADOW_ALL, parseSidesMask } from "../editor/frameShadowSides";

import {
  drawInnerFrameShadowOnMotif,
  drawOuterFrameShadowBySides,
  drawRealisticFrame,
  getFrameThickness,
} from "./frame";
import {
  isQuadPlaceholder,
  quadCropRect,
  type QuadCorners,
} from "./placeholderGeometry";
import { blitTextureToTemplateQuad } from "./perspectiveBlit";
import { WebGLWarpRenderer, isWebGLAvailable, resolveWarpParams } from "./webglWarp";

/** Interne Supersampling-Auflösung für WebGL-Warp beim Export (weichere Kanten, weniger Shader-Artefakte). */
const WARP_EXPORT_INTERNAL_SCALE = 2;

export type RenderElementOptions = {
  frameShadowOuterEnabled?: boolean;
  frameShadowInnerEnabled?: boolean;
  frameOuterSides?: number;
  frameInnerSides?: number;
  frameShadowDepth?: number;
  /** 0.15–1.0; nur das Motiv im Platzhalter, 1 = unverändert */
  artworkSaturation?: number;
  /** WebGL-Stoffverformung für Platzhalter aktivieren. */
  foldsEnabled?: boolean;
  foldStrength?: number;
  foldShadowDepth?: number;
  foldHighlightStrength?: number;
  foldSmoothing?: number;
  analysisDenoise?: number;
  foldNoiseFloor?: number;
  sobelRadius?: number;
};

export const renderElementToCanvas = (
  ctx: CanvasRenderingContext2D,
  el: TemplateElement,
  artImg: HTMLImageElement,
  artworkFrameStyle: FrameStyle,
  opts?: RenderElementOptions,
  /** Hintergrundbild des Templates (für WebGL-Stoffverformung). */
  bgImage?: HTMLImageElement | HTMLCanvasElement,
): void => {
  const outerOn = opts?.frameShadowOuterEnabled === true;
  const innerOn = opts?.frameShadowInnerEnabled === true;
  const outerMask = parseSidesMask(opts?.frameOuterSides ?? FRAME_SHADOW_ALL, FRAME_SHADOW_ALL);
  const innerMask = parseSidesMask(opts?.frameInnerSides ?? FRAME_SHADOW_ALL, FRAME_SHADOW_ALL);
  const depthRaw = opts?.frameShadowDepth;
  const shadowDepth = Math.min(
    1,
    Math.max(0.15, Number.isFinite(depthRaw) ? (depthRaw as number) : 0.82),
  );
  const satRaw = opts?.artworkSaturation ?? 1;
  const artworkSaturation = Math.min(1, Math.max(0.15, Number.isFinite(satRaw) ? satRaw : 1));
  const quadMode = isQuadPlaceholder(el) && el.quadCorners;
  ctx.save();

  if (!quadMode) {
    ctx.translate(el.x + el.w / 2, el.y + el.h / 2);
    ctx.rotate(((el.rotation ?? 0) * Math.PI) / 180);
    ctx.translate(-(el.x + el.w / 2), -(el.y + el.h / 2));
  }

  if (el.shadowEnabled && !quadMode) {
    ctx.shadowColor = el.shadowColor ?? "rgba(0,0,0,0.5)";
    ctx.shadowBlur = el.shadowBlur ?? 20;
    ctx.shadowOffsetX = el.shadowOffsetX ?? 10;
    ctx.shadowOffsetY = el.shadowOffsetY ?? 10;
  }

  if (el.type === "placeholder") {
    const useWebGL =
      opts?.foldsEnabled === true && bgImage != null && isWebGLAvailable();
    const warpParams = resolveWarpParams({
      foldStrength: opts?.foldStrength,
      foldShadowDepth: opts?.foldShadowDepth,
      foldHighlightStrength: opts?.foldHighlightStrength,
      foldSmoothing: opts?.foldSmoothing,
      artworkSaturation,
      sobelRadius: opts?.sobelRadius,
      analysisDenoise: opts?.analysisDenoise,
      foldNoiseFloor: opts?.foldNoiseFloor,
    });

    const drawRectangularMotifPass = (
      crop: { x: number; y: number; w: number; h: number },
      outW: number,
      outH: number,
    ): HTMLCanvasElement | null => {
      if (useWebGL) {
        const warped = WebGLWarpRenderer.renderOnce(
          bgImage!,
          artImg,
          crop,
          warpParams,
          outW,
          outH,
        );
        if (warped) return warped;
      }
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(outW));
      c.height = Math.max(1, Math.round(outH));
      const cctx = c.getContext("2d");
      if (!cctx) return null;
      const fake: TemplateElement = {
        ...el,
        x: 0,
        y: 0,
        w: c.width,
        h: c.height,
      };
      drawArtworkAspectFill(cctx, artImg, fake, artworkSaturation);
      return c;
    };

    if (quadMode && el.quadCorners) {
      ctx.shadowColor = "transparent";
      const crop = quadCropRect(el.quadCorners as QuadCorners);
      const pass = drawRectangularMotifPass(
        crop,
        Math.max(8, Math.round(crop.w * WARP_EXPORT_INTERNAL_SCALE)),
        Math.max(8, Math.round(crop.h * WARP_EXPORT_INTERNAL_SCALE)),
      );
      if (pass) {
        const projected = blitTextureToTemplateQuad(
          pass,
          el.quadCorners as QuadCorners,
          crop.x,
          crop.y,
          crop.w,
          crop.h,
        );
        if (projected) {
          ctx.drawImage(projected, crop.x, crop.y);
        } else {
          ctx.drawImage(pass, crop.x, crop.y);
        }
      }
    } else if (useWebGL) {
      const warped = WebGLWarpRenderer.renderOnce(
        bgImage!,
        artImg,
        { x: el.x, y: el.y, w: el.w, h: el.h },
        warpParams,
        Math.max(8, Math.round(el.w * WARP_EXPORT_INTERNAL_SCALE)),
        Math.max(8, Math.round(el.h * WARP_EXPORT_INTERNAL_SCALE)),
      );
      ctx.shadowColor = "transparent";
      if (warped) {
        ctx.drawImage(warped, el.x, el.y, el.w, el.h);
      } else {
        drawArtworkAspectFill(ctx, artImg, el, artworkSaturation);
      }
    } else {
      drawArtworkAspectFill(ctx, artImg, el, artworkSaturation);
      ctx.shadowColor = "transparent";
    }
    const tthick = getFrameThickness(el.w, el.h);
    if (innerOn && innerMask) {
      drawInnerFrameShadowOnMotif(
        ctx,
        el.x,
        el.y,
        el.w,
        el.h,
        shadowDepth,
        tthick,
        innerMask,
      );
    }
    drawRealisticFrame(ctx, el.x, el.y, el.w, el.h, artworkFrameStyle);
    if (outerOn && outerMask) {
      drawOuterFrameShadowBySides(ctx, el.x, el.y, el.w, el.h, tthick, outerMask, shadowDepth);
    }
  } else if (el.type === "rect") {
    ctx.fillStyle = el.color ?? "#e5e7eb";
    ctx.fillRect(el.x, el.y, el.w, el.h);
  } else if (el.type === "circle") {
    ctx.fillStyle = el.color ?? "#e5e7eb";
    ctx.beginPath();
    ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, el.w / 2, el.h / 2, 0, 0, 2 * Math.PI);
    ctx.fill();
  } else if (el.type === "triangle") {
    ctx.fillStyle = el.color ?? "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(el.x + el.w / 2, el.y);
    ctx.lineTo(el.x + el.w, el.y + el.h);
    ctx.lineTo(el.x, el.y + el.h);
    ctx.closePath();
    ctx.fill();
  } else if (el.type === "star") {
    ctx.fillStyle = el.color ?? "#e5e7eb";
    ctx.beginPath();
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    const spikes = 5;
    const outerRadius = el.w / 2;
    const innerRadius = el.w / 4;
    let rot = (Math.PI / 2) * 3;
    let xP: number;
    let yP: number;
    const step = Math.PI / spikes;
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      xP = cx + Math.cos(rot) * outerRadius;
      yP = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(xP, yP);
      rot += step;
      xP = cx + Math.cos(rot) * innerRadius;
      yP = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(xP, yP);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  } else if (el.type === "hexagon") {
    ctx.fillStyle = el.color ?? "#e5e7eb";
    ctx.beginPath();
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    ctx.moveTo(cx, cy - el.h / 2);
    ctx.lineTo(cx + el.w / 2, cy - el.h / 4);
    ctx.lineTo(cx + el.w / 2, cy + el.h / 4);
    ctx.lineTo(cx, cy + el.h / 2);
    ctx.lineTo(cx - el.w / 2, cy + el.h / 4);
    ctx.lineTo(cx - el.w / 2, cy - el.h / 4);
    ctx.closePath();
    ctx.fill();
  } else if (el.type === "text") {
    ctx.fillStyle = el.color ?? "#1c1917";
    ctx.font = `${el.fontStyle ?? "normal"} ${el.fontWeight ?? "normal"} ${el.fontSize ?? 60}px "${el.fontFamily ?? "Arial"}"`;
    ctx.textBaseline = "top";

    const curve = el.textCurve ?? 0;
    if (curve !== 0) {
      const chars = (el.text ?? "").split("");
      ctx.textAlign = "center";
      const anglePerChar = curve / Math.max(1, chars.length - 1);
      const radius = el.w / 2;
      ctx.translate(el.x + el.w / 2, el.y + el.h / 2);
      chars.forEach((char, i) => {
        ctx.save();
        const currentAngle = (i - (chars.length - 1) / 2) * anglePerChar;
        ctx.rotate((currentAngle * Math.PI) / 180);
        ctx.fillText(char, 0, -radius);
        ctx.restore();
      });
    } else {
      ctx.textAlign = (el.textAlign as CanvasTextAlign) ?? "left";
      let drawX = el.x;
      if (el.textAlign === "center") drawX = el.x + el.w / 2;
      if (el.textAlign === "right") drawX = el.x + el.w;

      const words = (el.text ?? "").replace(/\n/g, " \n ").split(" ");
      const wrapLines: string[] = [];
      let currentLine = "";

      for (let n = 0; n < words.length; n++) {
        if (words[n] === "\n") {
          wrapLines.push(currentLine);
          currentLine = "";
          continue;
        }
        const testLine = currentLine + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > el.w && n > 0) {
          wrapLines.push(currentLine);
          currentLine = `${words[n]} `;
        } else {
          currentLine = testLine;
        }
      }
      wrapLines.push(currentLine);

      const lineHeight = (el.fontSize ?? 60) * 1.2;
      wrapLines.forEach((line, lineIdx) => {
        ctx.fillText(line.trim(), drawX, el.y + lineIdx * lineHeight);
      });
    }
  }
  ctx.restore();
};

const drawArtworkAspectFill = (
  ctx: CanvasRenderingContext2D,
  artImg: HTMLImageElement,
  el: TemplateElement,
  artworkSaturation: number,
): void => {
  const canvasAspect = el.w / el.h;
  const imgAspect = artImg.width / artImg.height;
  let sx = 0;
  let sy = 0;
  let sWidth = artImg.width;
  let sHeight = artImg.height;
  if (imgAspect > canvasAspect) {
    sWidth = artImg.height * canvasAspect;
    sx = (artImg.width - sWidth) / 2;
  } else {
    sHeight = artImg.width / canvasAspect;
    sy = (artImg.height - sHeight) / 2;
  }
  if (artworkSaturation < 0.999) {
    ctx.filter = `saturate(${Math.round(artworkSaturation * 100)}%)`;
  }
  ctx.drawImage(artImg, sx, sy, sWidth, sHeight, el.x, el.y, el.w, el.h);
  ctx.filter = "none";
};
