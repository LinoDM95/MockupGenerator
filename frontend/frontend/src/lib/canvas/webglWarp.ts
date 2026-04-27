/**
 * GPU-beschleunigte Stoff-/Faltenverformung für Mockup-Motive.
 *
 * Angelehnt an die Server-Pipeline (Luminanz-Displacement + Template-Lighting):
 *   0. Intern: `buildStableAnalysisBackground` — entrauschte Grau-Version des Mockup-Ausschnitts
 *      nur für Analyse (Sobel, Luma, Lighting); das sichtbare Export-Motiv bleibt scharf.
 *   1. Zwei CPU-Vorverarbeitungen auf der Analyse-Textur: „weiches“ Grau und stark tiefpass-
 *      gefiltertes Grau — Falten bzw. Schatten-/Highlight-Basis.
 *   2. Falten (Displacement): Analyse-Luma vs. u_lumaSmooth; Noise-Floor + sanfte Sättigung
 *      statt aggressiver Gradient-Normalisierung (kein Hochziehen von Pixelrauschen).
 *   3. Lighting/Schatten: u_lumaLighting aus derselben Analyse-Textur (weich, niedrig aufgelöst).
 *   4. Rand: minimales Feather (~1 Texel), damit Motivränder scharf bleiben.
 */

const VERT_SRC = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x, 1.0 - a_pos.y);
  gl_Position = vec4(a_pos * 2.0 - 1.0, 0.0, 1.0);
}
`;

const FRAG_SRC = `
precision highp float;
varying vec2 v_uv;

uniform sampler2D u_artwork;
uniform sampler2D u_analysisBackground;
uniform sampler2D u_lumaSmooth;
uniform sampler2D u_lumaCoarse;
uniform sampler2D u_lumaLighting;

uniform vec2 u_texelSize;
uniform float u_foldStrength;
uniform float u_shadowDepth;
uniform float u_highlightStrength;
uniform float u_sobelRadius;
uniform float u_saturation;
uniform float u_detailGain;
uniform float u_bgMeanLuma;
uniform float u_noiseFloor;

float lumaAnalysis(vec2 tuv) {
  vec3 rgb = texture2D(u_analysisBackground, clamp(tuv, vec2(0.0), vec2(1.0))).rgb;
  return dot(rgb, vec3(0.299, 0.587, 0.114));
}

float smoothLuma(vec2 tuv) {
  return texture2D(u_lumaSmooth, clamp(tuv, vec2(0.0), vec2(1.0))).r;
}

float coarseLuma(vec2 tuv) {
  return texture2D(u_lumaCoarse, clamp(tuv, vec2(0.0), vec2(1.0))).r;
}

float lightingLuma(vec2 tuv) {
  return texture2D(u_lumaLighting, clamp(tuv, vec2(0.0), vec2(1.0))).r;
}

float softThresholdSigned(float v, float threshold) {
  float a = abs(v);
  float s = sign(v);
  float x = max(a - threshold, 0.0);
  return s * x / max(1.0 - threshold, 0.0001);
}

/** Binomial 3×3 / 16: nur weiche Lighting-Luma minus Tiefpass (kein Full-Res-Rauschen). */
float lightingDetailWeighted(vec2 uv, vec2 sm) {
  vec2 n = sm;
  float dc = lightingLuma(uv) - coarseLuma(uv);
  float v00 = lightingLuma(uv + vec2(-n.x, -n.y)) - coarseLuma(uv + vec2(-n.x, -n.y));
  float v01 = lightingLuma(uv + vec2( 0.0,  -n.y)) - coarseLuma(uv + vec2( 0.0,  -n.y));
  float v02 = lightingLuma(uv + vec2( n.x, -n.y)) - coarseLuma(uv + vec2( n.x, -n.y));
  float v10 = lightingLuma(uv + vec2(-n.x,  0.0)) - coarseLuma(uv + vec2(-n.x,  0.0));
  float v12 = lightingLuma(uv + vec2( n.x,  0.0)) - coarseLuma(uv + vec2( n.x,  0.0));
  float v20 = lightingLuma(uv + vec2(-n.x,  n.y)) - coarseLuma(uv + vec2(-n.x,  n.y));
  float v21 = lightingLuma(uv + vec2( 0.0,   n.y)) - coarseLuma(uv + vec2( 0.0,   n.y));
  float v22 = lightingLuma(uv + vec2( n.x,  n.y)) - coarseLuma(uv + vec2( n.x,  n.y));
  return (
    v00 + 2.0 * v01 + v02 +
    2.0 * v10 + 4.0 * dc + 2.0 * v12 +
    v20 + 2.0 * v21 + v22
  ) * 0.0625;
}

void main() {
  vec2 uv = v_uv;
  vec2 ts = u_texelSize * max(5.0, u_sobelRadius * 6.0);

  float b_ul = lumaAnalysis(uv + vec2(-ts.x, -ts.y));
  float b_u  = lumaAnalysis(uv + vec2( 0.0,  -ts.y));
  float b_ur = lumaAnalysis(uv + vec2( ts.x, -ts.y));
  float b_l  = lumaAnalysis(uv + vec2(-ts.x,  0.0));
  float b_c  = lumaAnalysis(uv);
  float b_r  = lumaAnalysis(uv + vec2( ts.x,  0.0));
  float b_dl = lumaAnalysis(uv + vec2(-ts.x,  ts.y));
  float b_d  = lumaAnalysis(uv + vec2( 0.0,   ts.y));
  float b_dr = lumaAnalysis(uv + vec2( ts.x,  ts.y));

  float s_ul = smoothLuma(uv + vec2(-ts.x, -ts.y));
  float s_u  = smoothLuma(uv + vec2( 0.0,  -ts.y));
  float s_ur = smoothLuma(uv + vec2( ts.x, -ts.y));
  float s_l  = smoothLuma(uv + vec2(-ts.x,  0.0));
  float s_c  = smoothLuma(uv);
  float s_r  = smoothLuma(uv + vec2( ts.x,  0.0));
  float s_dl = smoothLuma(uv + vec2(-ts.x,  ts.y));
  float s_d  = smoothLuma(uv + vec2( 0.0,   ts.y));
  float s_dr = smoothLuma(uv + vec2( ts.x,  ts.y));

  float d_ul = b_ul - s_ul;
  float d_u  = b_u  - s_u;
  float d_ur = b_ur - s_ur;
  float d_l  = b_l  - s_l;
  float d_r  = b_r  - s_r;
  float d_dl = b_dl - s_dl;
  float d_d  = b_d  - s_d;
  float d_dr = b_dr - s_dr;

  float dW = (d_ul + d_l + d_dl) * 0.3333333;
  float dE = (d_ur + d_r + d_dr) * 0.3333333;
  float dN = (d_ul + d_u + d_ur) * 0.3333333;
  float dS = (d_dl + d_d + d_dr) * 0.3333333;
  vec2 gRaw = vec2(dE - dW, dS - dN) * 0.5;
  float glen = length(gRaw);
  float reduced = max(glen - u_noiseFloor, 0.0);
  /** Weniger aggressive Sättigung als 6.0 — verhindert „plattgedrückte“ Reglerwirkung. */
  float softMag = reduced / (1.0 + reduced * 3.2);
  /** Früher einsetzen: nicht alles unter noiseFloor*4 unsichtbar machen. */
  float macroMask = smoothstep(u_noiseFloor * 0.65, u_noiseFloor * 2.5, glen);
  vec2 gDisp = glen > 1e-6
    ? (gRaw / glen) * softMag * macroMask
    : vec2(0.0);
  vec2 warpedUv = uv - (gDisp * u_detailGain * u_foldStrength * 0.16);

  vec2 artUv = clamp(warpedUv, vec2(1e-5), vec2(1.0 - 1e-5));
  vec4 art = texture2D(u_artwork, artUv);

  /** ~1–1.5 Texel weiches Antialiasing am Rand — kein breites Weichzeichnen mehr. */
  float edgeW = max(min(u_texelSize.x, u_texelSize.y) * 1.2, 1e-6);
  float maskX =
    smoothstep(0.0, edgeW, warpedUv.x) *
    (1.0 - smoothstep(1.0 - edgeW, 1.0, warpedUv.x));
  float maskY =
    smoothstep(0.0, edgeW, warpedUv.y) *
    (1.0 - smoothstep(1.0 - edgeW, 1.0, warpedUv.y));
  float edgeMask = maskX * maskY;
  float finalAlpha = art.a * edgeMask;

  float lum = dot(art.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 saturated = mix(vec3(lum), art.rgb, u_saturation);

  float minPx = min(1.0 / u_texelSize.x, 1.0 / u_texelSize.y);
  vec2 smA = u_texelSize * clamp(minPx * 0.032, 18.0, 42.0);
  vec2 smB = smA * 2.35;

  float detailL =
    lightingDetailWeighted(uv, smA) * 0.65 +
    lightingDetailWeighted(uv, smB) * 0.35;

  detailL = softThresholdSigned(detailL, 0.012);
  detailL = clamp(detailL, -0.22, 0.22);

  float sh = smoothstep(0.015, 0.22, -detailL);
  float hi = smoothstep(0.025, 0.20, detailL);

  float meanLm = max(u_bgMeanLuma, 0.08);
  float illumination = clamp(b_c / meanLm, 0.75, 1.25);

  float shadowAmt = sh * u_shadowDepth;
  float factor = illumination;
  factor *= (1.0 - shadowAmt);
  factor += hi * u_highlightStrength;
  factor = clamp(factor, 0.55, 1.35);

  vec3 lit = saturated * factor;

  gl_FragColor = vec4(lit, finalAlpha);
}
`;

export interface WarpParams {
  /** 0..1, Verschiebungsstärke. */
  foldStrength: number;
  /** 0..1, Multiply-Stärke gegen BG-Luminanz. */
  foldShadowDepth: number;
  /** 0..1, additive Highlights. */
  foldHighlightStrength: number;
  /** Mittlerer Blur (px) für „weiches“ Grau im Falten-Detail (Luma − Glättung), steuerbar wie zuvor. */
  foldSmoothing: number;
  /** Sobel-Radius in Texeln, default 1. */
  sobelRadius?: number;
  /** Motiv-Sättigung (geteilt mit Frame-System). Default 1. */
  artworkSaturation?: number;
  /**
   * 0..1. Stabilisiert die Mockup-Region vor der Faltenanalyse (intern, nicht das sichtbare Motiv).
   * Für T-Shirts oft 0.55–0.8.
   */
  analysisDenoise: number;
  /**
   * Unterdrückt Mikrodetails/Rauschen im Displacement (Shader-Schwelle).
   * Für Shirts oft 0.018–0.035.
   */
  foldNoiseFloor: number;
}

export interface WarpRegion {
  /** Zielregion innerhalb der Output-Canvas (nicht der BG-Pixel!). */
  x: number;
  y: number;
  w: number;
  h: number;
}

type Source = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

/**
 * Liefert eine aspect-fill-zugeschnittene Kopie des Motivs auf eine Zielgröße.
 * Übernommen aus renderElement.ts (Cover-Cropping), aber als Canvas.
 */
const aspectFillToCanvas = (src: Source, dstW: number, dstH: number): HTMLCanvasElement => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(dstW));
  c.height = Math.max(1, Math.round(dstH));
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  const sw = (src as HTMLImageElement).naturalWidth ?? src.width;
  const sh = (src as HTMLImageElement).naturalHeight ?? src.height;
  const canvasAspect = c.width / c.height;
  const imgAspect = sw / sh;
  let sx = 0;
  let sy = 0;
  let sWidth = sw;
  let sHeight = sh;
  if (imgAspect > canvasAspect) {
    sWidth = sh * canvasAspect;
    sx = (sw - sWidth) / 2;
  } else {
    sHeight = sw / canvasAspect;
    sy = (sh - sHeight) / 2;
  }
  /** Hochwertiges Resampling für Motivqualität. Keine Analyse-Glättung auf dem Motiv. */
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src as CanvasImageSource, sx, sy, sWidth, sHeight, 0, 0, c.width, c.height);
  return c;
};

/**
 * Schneidet eine Region des BG aus, in die finale Auflösung skaliert.
 * `srcRegion` ist in BG-Pixelkoordinaten; `dstW/H` ist die Zielcanvas-Größe.
 */
const cropBackgroundToCanvas = (
  bg: Source,
  srcRegion: { x: number; y: number; w: number; h: number },
  dstW: number,
  dstH: number,
): HTMLCanvasElement => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(dstW));
  c.height = Math.max(1, Math.round(dstH));
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.drawImage(
    bg as CanvasImageSource,
    srcRegion.x,
    srcRegion.y,
    srcRegion.w,
    srcRegion.h,
    0,
    0,
    c.width,
    c.height,
  );
  return c;
};

/** Grayscale + Blur — analog zu Gaussian auf Gray (Displacement: smooth). */
const buildLumaSmooth = (bgRegion: HTMLCanvasElement, blurPx: number): HTMLCanvasElement => {
  const c = document.createElement("canvas");
  c.width = bgRegion.width;
  c.height = bgRegion.height;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  const maxBlur = Math.min(bgRegion.width, bgRegion.height) * 0.18;
  const r = Math.min(Math.max(0.5, blurPx), maxBlur);
  ctx.filter = `grayscale(1) blur(${r}px)`;
  ctx.drawImage(bgRegion, 0, 0);
  ctx.filter = "none";
  return c;
};

/**
 * Extrem weicher Tiefpass: Downscale + zweifach Blur, Ausgabe in niedriger Auflösung.
 * Beim Sampling mit LINEAR im Shader entstehen automatisch weiche Übergänge (kein Blockgitter).
 */
const buildLumaCoarse = (bgRegion: HTMLCanvasElement): HTMLCanvasElement => {
  const w = bgRegion.width;
  const h = bgRegion.height;
  const m = Math.min(w, h);
  const scale = Math.min(0.48, Math.max(0.26, 200 / Math.max(1, m)));
  const tw = Math.max(40, Math.round(w * scale));
  const th = Math.max(40, Math.round(h * scale));

  const down = document.createElement("canvas");
  down.width = tw;
  down.height = th;
  const dctx = down.getContext("2d");
  if (!dctx) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }
  dctx.imageSmoothingEnabled = true;
  dctx.imageSmoothingQuality = "high";
  dctx.filter = "grayscale(1)";
  dctx.drawImage(bgRegion, 0, 0, tw, th);
  dctx.filter = "none";

  const r1 = Math.max(4, Math.min(16, Math.min(tw, th) * 0.09));
  const r2 = Math.max(3, Math.min(12, Math.min(tw, th) * 0.055));

  const tmp = document.createElement("canvas");
  tmp.width = tw;
  tmp.height = th;
  const tctx = tmp.getContext("2d");
  const out = document.createElement("canvas");
  out.width = tw;
  out.height = th;
  const octx = out.getContext("2d");
  if (!tctx || !octx) return down;

  tctx.filter = `blur(${r1}px)`;
  tctx.drawImage(down, 0, 0);
  tctx.filter = "none";

  octx.filter = `blur(${r2}px)`;
  octx.drawImage(tmp, 0, 0);
  octx.filter = "none";
  return out;
};

/**
 * Weiche Shadow-/Lighting-Luma: absichtlich niedrig aufgelöst + doppelter Blur.
 * Nicht Full-Res — verhindert, dass Körnung/JPEG zu Schatten werden.
 */
const buildLumaLighting = (bgRegion: HTMLCanvasElement): HTMLCanvasElement => {
  const w = bgRegion.width;
  const h = bgRegion.height;
  const m = Math.min(w, h);

  const scale = Math.min(0.6, Math.max(0.28, 280 / Math.max(1, m)));
  const tw = Math.max(64, Math.round(w * scale));
  const th = Math.max(64, Math.round(h * scale));

  const down = document.createElement("canvas");
  down.width = tw;
  down.height = th;

  const dctx = down.getContext("2d");
  if (!dctx) return bgRegion;

  dctx.imageSmoothingEnabled = true;
  dctx.imageSmoothingQuality = "high";
  dctx.filter = "grayscale(1)";
  dctx.drawImage(bgRegion, 0, 0, tw, th);
  dctx.filter = "none";

  const blurA = Math.max(8, Math.min(28, Math.min(tw, th) * 0.075));
  const blurB = Math.max(5, Math.min(20, Math.min(tw, th) * 0.045));

  const tmp = document.createElement("canvas");
  tmp.width = tw;
  tmp.height = th;

  const out = document.createElement("canvas");
  out.width = tw;
  out.height = th;

  const tctx = tmp.getContext("2d");
  const octx = out.getContext("2d");
  if (!tctx || !octx) return down;

  tctx.filter = `blur(${blurA}px)`;
  tctx.drawImage(down, 0, 0);
  tctx.filter = "none";

  octx.filter = `blur(${blurB}px)`;
  octx.drawImage(tmp, 0, 0);
  octx.filter = "none";

  return out;
};

const estimateMeanLuma = (bgRegion: HTMLCanvasElement): number => {
  const s = 48;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d");
  if (!ctx) return 0.5;
  ctx.filter = "grayscale(1)";
  ctx.drawImage(bgRegion, 0, 0, s, s);
  ctx.filter = "none";
  const data = ctx.getImageData(0, 0, s, s).data;
  let sum = 0;
  const n = s * s;
  for (let i = 0; i < data.length; i += 4) {
    sum += data[i] / 255;
  }
  return n > 0 ? sum / n : 0.5;
};

/**
 * Interne Analyse-Textur: entrauscht/stabilisiert für Falten- und Luma-Pipelines.
 * Das sichtbare Mockup bleibt unverändert — nur diese Canvas-Variante geht in Sobel/Lighting.
 */
const buildStableAnalysisBackground = (
  bgRegion: HTMLCanvasElement,
  strengthRaw: number,
): HTMLCanvasElement => {
  const strength = strengthRaw < 0 ? 0 : strengthRaw > 1 ? 1 : strengthRaw;
  const w = bgRegion.width;
  const h = bgRegion.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const outCtx = out.getContext("2d");
  if (!outCtx) return out;
  if (strength <= 0.001) {
    outCtx.drawImage(bgRegion, 0, 0);
    return out;
  }
  const minDim = Math.min(w, h);
  const scale = 1.0 - strength * 0.42;
  const tw = Math.max(64, Math.round(w * scale));
  const th = Math.max(64, Math.round(h * scale));
  const down = document.createElement("canvas");
  down.width = tw;
  down.height = th;
  const dctx = down.getContext("2d");
  if (!dctx) {
    outCtx.drawImage(bgRegion, 0, 0);
    return out;
  }
  dctx.imageSmoothingEnabled = true;
  dctx.imageSmoothingQuality = "high";
  const lowBlur = 0.35 + strength * 1.25;
  dctx.filter = `grayscale(1) blur(${lowBlur}px)`;
  dctx.drawImage(bgRegion, 0, 0, tw, th);
  dctx.filter = "none";
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = "high";
  const finalBlur = Math.min(minDim * 0.012, 0.25 + strength * 0.9);
  outCtx.filter = `blur(${finalBlur}px)`;
  outCtx.drawImage(down, 0, 0, tw, th, 0, 0, w, h);
  outCtx.filter = "none";
  return out;
};

const compileShader = (gl: WebGLRenderingContext, type: number, src: string): WebGLShader => {
  const sh = gl.createShader(type);
  if (!sh) throw new Error("WebGL: createShader failed");
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) ?? "(unknown)";
    gl.deleteShader(sh);
    throw new Error(`WebGL Shader compile error: ${log}`);
  }
  return sh;
};

const createProgram = (gl: WebGLRenderingContext): WebGLProgram => {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  const prog = gl.createProgram();
  if (!prog) throw new Error("WebGL: createProgram failed");
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog) ?? "(unknown)";
    gl.deleteProgram(prog);
    throw new Error(`WebGL Program link error: ${log}`);
  }
  return prog;
};

type TexFilterMode = { minFilter: number; magFilter: number };

const uploadTexture = (
  gl: WebGLRenderingContext,
  unit: number,
  source: TexImageSource,
  filters?: TexFilterMode,
): WebGLTexture => {
  const tex = gl.createTexture();
  if (!tex) throw new Error("WebGL: createTexture failed");
  const minF = filters?.minFilter ?? gl.LINEAR;
  const magF = filters?.magFilter ?? gl.LINEAR;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minF);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magF);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  return tex;
};

type WarpResources = {
  art: HTMLCanvasElement;
  /** Sichtbarer Originalausschnitt (Referenz / Debug). */
  bgRaw: HTMLCanvasElement;
  /** Entrauschte Analyse-Version — Falten/Luminanz/Sobel nur hierauf. */
  bgAnalysis: HTMLCanvasElement | null;
  lumaSmooth: HTMLCanvasElement | null;
  lumaCoarse: HTMLCanvasElement | null;
  lumaLighting: HTMLCanvasElement | null;
  bgMeanLuma: number;
};

/**
 * Wiederverwendbarer WebGL-Warp-Renderer.
 *
 * Aufruf-Pattern für Live-Preview (60 FPS):
 *   const r = new WebGLWarpRenderer();
 *   r.setSources(bgImg, artImg, region);  // einmalig pro Asset-Wechsel
 *   r.render(params);                      // pro Slider-Frame
 *
 * Aufruf-Pattern für Export (einmalig, hochauflösend):
 *   const r = WebGLWarpRenderer.renderOnce(bg, art, region, params, dstSize);
 */
export class WebGLWarpRenderer {
  private gl: WebGLRenderingContext | null = null;
  private canvas: HTMLCanvasElement;
  private program: WebGLProgram | null = null;
  private texArt: WebGLTexture | null = null;
  private texAnalysisBackground: WebGLTexture | null = null;
  private texLumaSmooth: WebGLTexture | null = null;
  private texLumaCoarse: WebGLTexture | null = null;
  private texLumaLighting: WebGLTexture | null = null;
  private resources: WarpResources | null = null;
  private quadBuffer: WebGLBuffer | null = null;
  private uTexel: WebGLUniformLocation | null = null;
  private uFold: WebGLUniformLocation | null = null;
  private uShadow: WebGLUniformLocation | null = null;
  private uHighlight: WebGLUniformLocation | null = null;
  private uSobel: WebGLUniformLocation | null = null;
  private uDetailGain: WebGLUniformLocation | null = null;
  private uSat: WebGLUniformLocation | null = null;
  private uArt: WebGLUniformLocation | null = null;
  private uAnalysisBackground: WebGLUniformLocation | null = null;
  private uLumaSmooth: WebGLUniformLocation | null = null;
  private uLumaCoarse: WebGLUniformLocation | null = null;
  private uLumaLighting: WebGLUniformLocation | null = null;
  private uBgMeanLuma: WebGLUniformLocation | null = null;
  private uNoiseFloor: WebGLUniformLocation | null = null;
  private aPos: number = 0;
  private lastBlurPx: number = -1;
  private lastAnalysisDenoise: number = -1;

  /**
   * @param ownsCanvas erzeugt automatisch ein internes Canvas. Für Live-Preview
   *                  kann ein externes Canvas übergeben werden (DOM-attached).
   */
  constructor(externalCanvas?: HTMLCanvasElement) {
    this.canvas = externalCanvas ?? document.createElement("canvas");
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /** Einmaliger Aufruf für Export (Off-Screen). */
  static renderOnce(
    bg: Source,
    art: Source,
    bgRegion: { x: number; y: number; w: number; h: number },
    params: WarpParams,
    dstW: number,
    dstH: number,
  ): HTMLCanvasElement | null {
    try {
      const outW = Math.max(1, Math.round(dstW));
      const outH = Math.max(1, Math.round(dstH));
      const maxDim = getMaxTextureSizeForWarp();
      const span = Math.max(outW, outH);
      const scale = span > maxDim ? maxDim / span : 1;
      const intW = Math.max(1, Math.round(outW * scale));
      const intH = Math.max(1, Math.round(outH * scale));

      const r = new WebGLWarpRenderer();
      r.canvas.width = intW;
      r.canvas.height = intH;
      r.setSources(bg, art, bgRegion, intW, intH);
      r.render(params);
      if (intW === outW && intH === outH) {
        return r.canvas;
      }
      const out = document.createElement("canvas");
      out.width = outW;
      out.height = outH;
      const octx = out.getContext("2d");
      if (!octx) {
        r.dispose();
        return r.canvas;
      }
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = "high";
      octx.drawImage(r.canvas, 0, 0, intW, intH, 0, 0, outW, outH);
      r.dispose();
      return out;
    } catch (err) {
      console.warn("[webglWarp] renderOnce failed:", err);
      return null;
    }
  }

  /**
   * Lädt BG-Region und Motiv in interne Texturen (CPU-Vorverarbeitung + GPU-Upload).
   * Luma-Hilfs-Texturen werden beim ersten Render bzw. bei Blur-/Größenwechsel neu berechnet.
   */
  setSources(
    bg: Source,
    art: Source,
    bgRegion: { x: number; y: number; w: number; h: number },
    dstW: number,
    dstH: number,
  ): void {
    this.canvas.width = Math.max(1, Math.round(dstW));
    this.canvas.height = Math.max(1, Math.round(dstH));
    const w = this.canvas.width;
    const h = this.canvas.height;
    const bgCanvas = cropBackgroundToCanvas(bg, bgRegion, w, h);
    const artCanvas = aspectFillToCanvas(art, w, h);
    this.resources = {
      art: artCanvas,
      bgRaw: bgCanvas,
      bgAnalysis: null,
      lumaSmooth: null,
      lumaCoarse: null,
      lumaLighting: null,
      bgMeanLuma: 0.5,
    };
    this.lastBlurPx = -1;
    this.lastAnalysisDenoise = -1;
    this.disposeTextures();
  }

  render(params: WarpParams): void {
    if (!this.resources) {
      throw new Error("WebGLWarpRenderer.render called before setSources");
    }
    /** Sicherstellen, dass Analyse/Noise auch bei partiellen Objekten (Runtime) stabil sind. */
    const resolved = resolveWarpParams(params);
    const analysisDenoise = resolved.analysisDenoise;
    const denoiseChanged =
      this.lastAnalysisDenoise < 0 ||
      Math.abs(analysisDenoise - this.lastAnalysisDenoise) > 0.005;

    if (!this.resources.bgAnalysis || denoiseChanged) {
      this.resources.bgAnalysis = buildStableAnalysisBackground(
        this.resources.bgRaw,
        analysisDenoise,
      );
      this.lastAnalysisDenoise = analysisDenoise;
      this.resources.lumaCoarse = null;
      this.resources.lumaLighting = null;
      this.resources.lumaSmooth = null;
      this.lastBlurPx = -1;
      if (this.texAnalysisBackground && this.gl) {
        this.gl.deleteTexture(this.texAnalysisBackground);
        this.texAnalysisBackground = null;
      }
      if (this.texLumaCoarse && this.gl) {
        this.gl.deleteTexture(this.texLumaCoarse);
        this.texLumaCoarse = null;
      }
      if (this.texLumaLighting && this.gl) {
        this.gl.deleteTexture(this.texLumaLighting);
        this.texLumaLighting = null;
      }
      if (this.texLumaSmooth && this.gl) {
        this.gl.deleteTexture(this.texLumaSmooth);
        this.texLumaSmooth = null;
      }
    }

    const bgA = this.resources.bgAnalysis;
    if (!bgA) {
      throw new Error("WebGLWarpRenderer: bgAnalysis missing");
    }

    const blurPx = Math.max(0.5, resolved.foldSmoothing);
    if (!this.resources.lumaCoarse) {
      this.resources.lumaCoarse = buildLumaCoarse(bgA);
      this.resources.bgMeanLuma = estimateMeanLuma(bgA);
      if (this.texLumaCoarse && this.gl) {
        this.gl.deleteTexture(this.texLumaCoarse);
        this.texLumaCoarse = null;
      }
    }
    if (!this.resources.lumaLighting) {
      this.resources.lumaLighting = buildLumaLighting(bgA);
      if (this.texLumaLighting && this.gl) {
        this.gl.deleteTexture(this.texLumaLighting);
        this.texLumaLighting = null;
      }
    }
    const blurChanged =
      this.lastBlurPx < 0 || Math.abs(blurPx - this.lastBlurPx) > 0.01;
    if (blurChanged || !this.resources.lumaSmooth) {
      this.resources.lumaSmooth = buildLumaSmooth(bgA, blurPx);
      this.lastBlurPx = blurPx;
      if (this.texLumaSmooth && this.gl) {
        this.gl.deleteTexture(this.texLumaSmooth);
        this.texLumaSmooth = null;
      }
    }
    this.ensureGL();
    const gl = this.gl!;
    if (!this.texArt) {
      this.texArt = uploadTexture(gl, 0, this.resources.art);
    }
    if (!this.texAnalysisBackground) this.texAnalysisBackground = uploadTexture(gl, 1, bgA);
    if (!this.texLumaSmooth && this.resources.lumaSmooth) {
      this.texLumaSmooth = uploadTexture(gl, 2, this.resources.lumaSmooth);
    }
    if (!this.texLumaCoarse && this.resources.lumaCoarse) {
      this.texLumaCoarse = uploadTexture(gl, 3, this.resources.lumaCoarse);
    }
    if (!this.texLumaLighting && this.resources.lumaLighting) {
      this.texLumaLighting = uploadTexture(gl, 4, this.resources.lumaLighting);
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texArt);
    gl.uniform1i(this.uArt, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.texAnalysisBackground);
    gl.uniform1i(this.uAnalysisBackground, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.texLumaSmooth!);
    gl.uniform1i(this.uLumaSmooth, 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.texLumaCoarse!);
    gl.uniform1i(this.uLumaCoarse, 3);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.texLumaLighting!);
    gl.uniform1i(this.uLumaLighting, 4);

    gl.uniform2f(this.uTexel, 1 / this.canvas.width, 1 / this.canvas.height);
    gl.uniform1f(this.uFold, clamp01(resolved.foldStrength));
    gl.uniform1f(this.uShadow, clamp01(resolved.foldShadowDepth));
    gl.uniform1f(this.uHighlight, clamp01(resolved.foldHighlightStrength));
    gl.uniform1f(this.uSobel, resolved.sobelRadius ?? 1.0);
    gl.uniform1f(this.uDetailGain, DEFAULT_DETAIL_GAIN);
    gl.uniform1f(this.uSat, resolved.artworkSaturation ?? 1.0);
    gl.uniform1f(this.uBgMeanLuma, this.resources.bgMeanLuma);
    gl.uniform1f(this.uNoiseFloor, Math.max(0, resolved.foldNoiseFloor));

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose(): void {
    this.disposeTextures();
    if (this.gl && this.program) this.gl.deleteProgram(this.program);
    if (this.gl && this.quadBuffer) this.gl.deleteBuffer(this.quadBuffer);
    this.program = null;
    this.quadBuffer = null;
    this.gl = null;
    this.resources = null;
  }

  private disposeTextures(): void {
    if (!this.gl) return;
    if (this.texArt) {
      this.gl.deleteTexture(this.texArt);
      this.texArt = null;
    }
    if (this.texAnalysisBackground) {
      this.gl.deleteTexture(this.texAnalysisBackground);
      this.texAnalysisBackground = null;
    }
    if (this.texLumaSmooth) {
      this.gl.deleteTexture(this.texLumaSmooth);
      this.texLumaSmooth = null;
    }
    if (this.texLumaCoarse) {
      this.gl.deleteTexture(this.texLumaCoarse);
      this.texLumaCoarse = null;
    }
    if (this.texLumaLighting) {
      this.gl.deleteTexture(this.texLumaLighting);
      this.texLumaLighting = null;
    }
  }

  private ensureGL(): void {
    if (this.gl) return;
    const gl = this.canvas.getContext("webgl", {
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      antialias: true,
      alpha: true,
    }) as WebGLRenderingContext | null;
    if (!gl) throw new Error("WebGL nicht verfügbar in diesem Browser.");
    this.gl = gl;
    this.program = createProgram(gl);
    this.aPos = gl.getAttribLocation(this.program, "a_pos");
    this.uTexel = gl.getUniformLocation(this.program, "u_texelSize");
    this.uFold = gl.getUniformLocation(this.program, "u_foldStrength");
    this.uShadow = gl.getUniformLocation(this.program, "u_shadowDepth");
    this.uHighlight = gl.getUniformLocation(this.program, "u_highlightStrength");
    this.uSobel = gl.getUniformLocation(this.program, "u_sobelRadius");
    this.uDetailGain = gl.getUniformLocation(this.program, "u_detailGain");
    this.uSat = gl.getUniformLocation(this.program, "u_saturation");
    this.uArt = gl.getUniformLocation(this.program, "u_artwork");
    this.uAnalysisBackground = gl.getUniformLocation(this.program, "u_analysisBackground");
    this.uLumaSmooth = gl.getUniformLocation(this.program, "u_lumaSmooth");
    this.uLumaCoarse = gl.getUniformLocation(this.program, "u_lumaCoarse");
    this.uLumaLighting = gl.getUniformLocation(this.program, "u_lumaLighting");
    this.uBgMeanLuma = gl.getUniformLocation(this.program, "u_bgMeanLuma");
    this.uNoiseFloor = gl.getUniformLocation(this.program, "u_noiseFloor");

    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
  }
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Amplitude der UV-Verformung (Sobel auf Analyse-Luma − weiches Grau); mit Shader-Faktor 0.16 gekoppelt. */
const DEFAULT_DETAIL_GAIN = 1.45;

/**
 * Max. WebGL-Texturgröße (Export in 4k+ würde sonst texImage2D fehlschlagen → kein Warp).
 */
let _cachedMaxTextureSize: number | null = null;
const getMaxTextureSizeForWarp = (): number => {
  if (_cachedMaxTextureSize !== null) return _cachedMaxTextureSize;
  try {
    const c = document.createElement("canvas");
    const gl =
      (c.getContext("webgl") || c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (gl) {
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
      _cachedMaxTextureSize = Math.min(Math.max(512, max), 8192);
    } else {
      _cachedMaxTextureSize = 4096;
    }
  } catch {
    _cachedMaxTextureSize = 4096;
  }
  return _cachedMaxTextureSize;
};

/** Merged params with safe defaults. */
export const resolveWarpParams = (raw: Partial<WarpParams>): WarpParams => ({
  foldStrength: raw.foldStrength ?? 0.35,
  foldShadowDepth: raw.foldShadowDepth ?? 0.28,
  foldHighlightStrength: raw.foldHighlightStrength ?? 0.08,
  foldSmoothing: raw.foldSmoothing ?? 6,
  sobelRadius: raw.sobelRadius ?? 1,
  artworkSaturation: raw.artworkSaturation ?? 1,
  analysisDenoise: raw.analysisDenoise ?? 0.42,
  foldNoiseFloor: raw.foldNoiseFloor ?? 0.012,
});

/** Detect once whether WebGL is available; cached. */
let _webglAvailable: boolean | null = null;
export const isWebGLAvailable = (): boolean => {
  if (_webglAvailable !== null) return _webglAvailable;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
    _webglAvailable = !!gl;
  } catch {
    _webglAvailable = false;
  }
  return _webglAvailable;
};
