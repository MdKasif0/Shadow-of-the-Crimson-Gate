import * as THREE from 'three';

/** Seamless value noise with a whole-number period, so textures tile without a seam. */
function tiledNoise(size: number, periods: number[], seed: number): Float32Array {
  const out = new Float32Array(size * size);
  let random = seed;
  const next = () => {
    random = (random * 16807) % 2147483647;
    return random / 2147483647;
  };

  let amplitude = 1;
  let total = 0;
  for (const period of periods) {
    const grid = new Float32Array(period * period).map(() => next());
    for (let y = 0; y < size; y++) {
      const gy = (y / size) * period;
      const y0 = Math.floor(gy);
      const fy = gy - y0;
      const sy = fy * fy * (3 - 2 * fy);
      for (let x = 0; x < size; x++) {
        const gx = (x / size) * period;
        const x0 = Math.floor(gx);
        const fx = gx - x0;
        const sx = fx * fx * (3 - 2 * fx);
        const a = grid[y0 * period + x0];
        const b = grid[y0 * period + (x0 + 1) % period];
        const c = grid[((y0 + 1) % period) * period + x0];
        const d = grid[((y0 + 1) % period) * period + (x0 + 1) % period];
        const top = a + (b - a) * sx;
        const bottom = c + (d - c) * sx;
        out[y * size + x] += (top + (bottom - top) * sy) * amplitude;
      }
    }
    total += amplitude;
    amplitude *= 0.55;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function toTexture(data: Uint8ClampedArray, size: number, isColor: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(size, size);
  image.data.set(data);
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  if (isColor) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface SurfaceTextures {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
}

/** Grey detail map and matching normal map. Tint comes from vertex or instance colours. */
export function createSurfaceTextures(periods: number[], seed: number, relief: number): SurfaceTextures {
  const size = 512;
  const height = tiledNoise(size, periods, seed);
  const albedo = new Uint8ClampedArray(size * size * 4);
  const normal = new Uint8ClampedArray(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const h = height[i];
      const dx = (height[y * size + (x + 1) % size] - height[y * size + (x + size - 1) % size]) * relief;
      const dy = (height[((y + 1) % size) * size + x] - height[((y + size - 1) % size) * size + x]) * relief;
      const length = Math.hypot(dx, dy, 1);

      const shade = 150 + h * 105;
      albedo.set([shade, shade, shade, 255], i * 4);
      normal.set([
        (-dx / length) * 127 + 128,
        (dy / length) * 127 + 128,
        (1 / length) * 127 + 128,
        255,
      ], i * 4);
    }
  }

  return { map: toTexture(albedo, size, true), normalMap: toTexture(normal, size, false) };
}

let glowTexture: THREE.CanvasTexture | null = null;

/** Soft radial falloff shared by every glow sprite, light pool and mist puff. */
export function getGlowTexture(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}
