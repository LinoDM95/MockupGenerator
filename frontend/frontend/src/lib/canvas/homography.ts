/**
 * Homographie (3×3, h33 = 1) von der Einheits-UV-Ebene [0,1]² zu Template-Pixelkoordinaten.
 * Eck-Reihenfolge: TL (0,0), TR (1,0), BR (1,1), BL (0,1) ↔ dst[0]…dst[3] in gleicher Reihenfolge.
 */

export type Point2 = { x: number; y: number };

const solve8 = (A: number[][], b: number[]): number[] | null => {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) return null;
    if (pivot !== col) [M[col], M[pivot]] = [M[pivot], M[col]];
    const div = M[col][col];
    for (let c = col; c <= n; c++) M[col][c] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (Math.abs(f) < 1e-15) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row) => row[n]);
};

/**
 * Forward 3×3 (row-major): [x', y', w']ᵀ = H · [u, v, 1]ᵀ, dann x=x'/w', y=y'/w'.
 * Letzte Zeile normiert auf h33 = 1.
 */
export const homographyUv01ToTemplate = (dst: [Point2, Point2, Point2, Point2]): Float64Array => {
  const src: [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = src[i];
    const { x, y } = dst[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    b.push(y);
  }
  const h8 = solve8(A, b);
  if (!h8) {
    return new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  }
  const [h11, h12, h13, h21, h22, h23, h31, h32] = h8;
  return new Float64Array([h11, h12, h13, h21, h22, h23, h31, h32, 1]);
};

/** 3×3 Invertierung (row-major). */
export const invertMat3RowMajor = (m: Float64Array): Float64Array | null => {
  const a = m[0],
    b = m[1],
    c = m[2],
    d = m[3],
    e = m[4],
    f = m[5],
    g = m[6],
    h = m[7],
    i = m[8];
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;
  let det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  det = 1 / det;
  return new Float64Array([
    A * det,
    D * det,
    G * det,
    B * det,
    E * det,
    H * det,
    C * det,
    F * det,
    I * det,
  ]);
};

export const multiplyMat3Vec3 = (m: Float64Array, x: number, y: number, z: number): [number, number, number] => {
  const x1 = m[0] * x + m[1] * y + m[2] * z;
  const y1 = m[3] * x + m[4] * y + m[5] * z;
  const z1 = m[6] * x + m[7] * y + m[8] * z;
  return [x1, y1, z1];
};
