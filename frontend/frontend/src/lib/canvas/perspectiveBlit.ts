import type { QuadCorners } from "./placeholderGeometry";
import { homographyUv01ToTemplate, invertMat3RowMajor } from "./homography";

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
uniform sampler2D u_tex;
uniform mat3 u_invH;
uniform vec2 u_rxRy;
uniform vec2 u_viewport;

void main() {
  float px = gl_FragCoord.x;
  float py = u_viewport.y - gl_FragCoord.y;
  float tx = u_rxRy.x + px;
  float ty = u_rxRy.y + py;
  vec3 q = u_invH * vec3(tx, ty, 1.0);
  if (abs(q.z) < 1e-6) discard;
  vec2 uv = q.xy / q.z;
  if (uv.x < -0.002 || uv.x > 1.002 || uv.y < -0.002 || uv.y > 1.002) discard;
  gl_FragColor = texture2D(u_tex, clamp(uv, 0.0, 1.0));
}
`;

const compile = (gl: WebGLRenderingContext, type: number, src: string): WebGLShader => {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) ?? "";
    gl.deleteShader(sh);
    throw new Error(`perspectiveBlit: ${log}`);
  }
  return sh;
};

const colMajorFromRow = (m: Float64Array): Float32Array =>
  new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]);

/**
 * Zeichnet eine rechteckige Textur (Motiv-Pass) perspektivisch auf die Quad-Ecken im Template-Raum.
 * Ausgabe-Canvas = AABB (rx,ry,rw,rh), Alpha außerhalb des Vierecks transparent.
 */
export const blitTextureToTemplateQuad = (
  source: TexImageSource,
  cornersTpl: QuadCorners,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): HTMLCanvasElement | null => {
  try {
    const H = homographyUv01ToTemplate(cornersTpl);
    const inv = invertMat3RowMajor(H);
    if (!inv) return null;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, rw);
    canvas.height = Math.max(1, rh);
    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    }) as WebGLRenderingContext | null;
    if (!gl) return null;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;

    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    gl.useProgram(prog);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1i(gl.getUniformLocation(prog, "u_tex"), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniformMatrix3fv(gl.getUniformLocation(prog, "u_invH"), false, colMajorFromRow(inv));
    gl.uniform2f(gl.getUniformLocation(prog, "u_rxRy"), rx, ry);
    gl.uniform2f(gl.getUniformLocation(prog, "u_viewport"), rw, rh);

    gl.viewport(0, 0, rw, rh);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.deleteTexture(tex);
    gl.deleteBuffer(buf);
    gl.deleteProgram(prog);
    return canvas;
  } catch (e) {
    console.warn("[perspectiveBlit]", e);
    return null;
  }
};
