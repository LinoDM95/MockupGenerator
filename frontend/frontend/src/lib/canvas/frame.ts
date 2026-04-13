import type { FrameStyle } from "../../types/mockup";

export const drawRealisticFrame = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  style: FrameStyle,
): void => {
  if (style === "none") return;
  const thickness = Math.max(w, h) * 0.025;
  const colors = {
    black: {
      top: "#333333",
      right: "#1a1a1a",
      bottom: "#0a0a0a",
      left: "#242424",
      inner: "#111111",
    },
    white: {
      top: "#ffffff",
      right: "#efefef",
      bottom: "#d4d4d4",
      left: "#f5f5f5",
      inner: "#cccccc",
    },
    wood: {
      top: "#b8865c",
      right: "#8b5a2b",
      bottom: "#5c3a19",
      left: "#a36d39",
      inner: "#381f0d",
    },
  }[style];

  const drawTrapezoid = (
    cx1: number,
    cy1: number,
    cx2: number,
    cy2: number,
    cx3: number,
    cy3: number,
    cx4: number,
    cy4: number,
    color: string,
  ) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx1, cy1);
    ctx.lineTo(cx2, cy2);
    ctx.lineTo(cx3, cy3);
    ctx.lineTo(cx4, cy4);
    ctx.closePath();
    ctx.fill();
  };

  const outX = x - thickness;
  const outY = y - thickness;
  const outW = w + thickness * 2;
  const outH = h + thickness * 2;

  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = thickness * 1.5;
  ctx.shadowOffsetX = thickness * 0.5;
  ctx.shadowOffsetY = thickness * 0.8;
  ctx.strokeStyle = colors.top;
  ctx.lineWidth = thickness;
  ctx.strokeRect(outX + thickness / 2, outY + thickness / 2, w + thickness, h + thickness);
  ctx.shadowColor = "transparent";

  drawTrapezoid(outX, outY, outX + outW, outY, x + w, y, x, y, colors.top);
  drawTrapezoid(outX + outW, outY, outX + outW, outY + outH, x + w, y + h, x + w, y, colors.right);
  drawTrapezoid(outX + outW, outY + outH, outX, outY + outH, x, y + h, x + w, y + h, colors.bottom);
  drawTrapezoid(outX, outY + outH, outX, outY, x, y, x, y + h, colors.left);

  ctx.strokeStyle = colors.inner;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
};
