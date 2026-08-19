// Simple 2D value noise for terrain generation
export function noise2D(x: number, z: number): number {
  const ix = Math.floor(x); const iz = Math.floor(z);
  const fx = x - ix; const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz); const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1); const d = hash(ix + 1, iz + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

function hash(x: number, z: number): number {
  let n = x * 374761393 + z * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  n = n ^ (n >> 16);
  return (n & 0x7fffffff) / 0x7fffffff;
}

export function fbm(x: number, z: number, octaves: number = 4, lacunarity: number = 2, gain: number = 0.5): number {
  let value = 0; let amplitude = 1; let frequency = 1; let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * frequency, z * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= gain; frequency *= lacunarity;
  }
  return value / maxValue;
}
