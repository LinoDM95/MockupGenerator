/**
 * Mulberry32: deterministischer PRNG pro Start-Seed.
 * Vermeidet Math.random im Render (eslint react-hooks/purity).
 */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return (): number => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const randomBetween = (rng: () => number, min: number, max: number): number =>
  min + rng() * (max - min);
