import type { FrameStyle } from "../../types/mockup";
import type { TemplateElement } from "../../types/mockup";

import { drawRealisticFrame } from "./frame";

export const renderElementToCanvas = (
  ctx: CanvasRenderingContext2D,
  el: TemplateElement,
  artImg: HTMLImageElement,
  artworkFrameStyle: FrameStyle,
): void => {
  ctx.save();

  ctx.translate(el.x + el.w / 2, el.y + el.h / 2);
  ctx.rotate(((el.rotation ?? 0) * Math.PI) / 180);
  ctx.translate(-(el.x + el.w / 2), -(el.y + el.h / 2));

  if (el.shadowEnabled) {
    ctx.shadowColor = el.shadowColor ?? "rgba(0,0,0,0.5)";
    ctx.shadowBlur = el.shadowBlur ?? 20;
    ctx.shadowOffsetX = el.shadowOffsetX ?? 10;
    ctx.shadowOffsetY = el.shadowOffsetY ?? 10;
  }

  if (el.type === "placeholder") {
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

    ctx.drawImage(artImg, sx, sy, sWidth, sHeight, el.x, el.y, el.w, el.h);
    ctx.shadowColor = "transparent";
    drawRealisticFrame(ctx, el.x, el.y, el.w, el.h, artworkFrameStyle);
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
