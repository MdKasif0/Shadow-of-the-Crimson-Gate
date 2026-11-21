import * as THREE from 'three';

/**
 * Surfaces — Wood grain, worn stone, lacquer, paper and the rest, painted onto
 * any lit material in world space. The game's geometry is built in code and
 * has no useful texture coordinates, so each surface is sampled three ways
 * (from the side, front and top) and blended by which way the face points.
 *
 * Each surface is a small tiling detail texture: red is height and tone,
 * green is roughness. It tints the material's own colour, roughens or polishes
 * it, and bumps its normals, so the base colours chosen for each level stay.
 */

export type SurfaceKind = 'wood' | 'stone' | 'lacquer' | 'paper' | 'plaster' | 'roof' | 'metal' | 'soil' | 'bamboo';

interface SurfaceStyle {
  /** World units per texture repeat. */
  scale: number;
  /** How far the texture stretches along the grain on vertical faces (1 for none). */
  grain: number;
  /** How much the tone varies. */
  strength: number;
  bump: number;
}

const STYLES: Record<SurfaceKind, SurfaceStyle> = {
  wood: { scale: 1.6, grain: 6, strength: 0.32, bump: 0.9 },
  bamboo: { scale: 0.8, grain: 10, strength: 0.2, bump: 0.5 },
  stone: { scale: 2.4, grain: 1, strength: 0.34, bump: 1.4 },
  lacquer: { scale: 3, grain: 1, strength: 0.12, bump: 0.25 },
  paper: { scale: 0.9, grain: 1.4, strength: 0.14, bump: 0.3 },
  plaster: { scale: 3.2, grain: 1, strength: 0.2, bump: 0.6 },
  roof: { scale: 1.1, grain: 1, strength: 0.28, bump: 1.1 },
  metal: { scale: 1.4, grain: 3, strength: 0.16, bump: 0.35 },
  soil: { scale: 4, grain: 1, strength: 0.25, bump: 0.9 },
};

/** Shared by every patched material: how wet the world is, from 0 to 1. */
export const SurfaceUniforms = {
  uWetness: { value: 0 },
};

// ─── Detail textures, drawn once ─────────────────────────────────────────

const SIZE = 256;

function makeNoise(seed: number) {
  const perm = new Uint8Array(512);
  const values = new Float32Array(256);
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 256; i++) { perm[i] = i; values[i] = rand(); }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const lattice = (x: number, y: number) => values[perm[(x & 255) + perm[y & 255]]];
  // Tiling value noise: the lattice wraps at `period`
  return (x: number, y: number, period: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const wrap = (n: number) => ((n % period) + period) % period;
    const a = lattice(wrap(xi), wrap(yi)), b = lattice(wrap(xi + 1), wrap(yi));
    const c = lattice(wrap(xi), wrap(yi + 1)), d = lattice(wrap(xi + 1), wrap(yi + 1));
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

function fbm(noise: ReturnType<typeof makeNoise>, x: number, y: number, octaves: number, base: number): number {
  let sum = 0, amp = 0.5, freq = base;
  for (let i = 0; i < octaves; i++) {
    sum += noise(x * freq, y * freq, freq) * amp;
    freq *= 2;
    amp *= 0.5;
  }
  return sum / (1 - Math.pow(0.5, octaves));
}

/** Height/tone and roughness for one surface at a point in [0, 1). */
function sample(kind: SurfaceKind, noise: ReturnType<typeof makeNoise>, x: number, y: number): [number, number] {
  switch (kind) {
    case 'wood':
    case 'bamboo': {
      // Rings warped by a slow wobble, read as grain running along y
      const warp = fbm(noise, x, y, 3, 4) * 3;
      const rings = Math.sin((x * (kind === 'bamboo' ? 18 : 26) + warp) * Math.PI * 2) * 0.5 + 0.5;
      const fibre = fbm(noise, x * 3, y * 0.3, 3, 16);
      const knot = kind === 'wood' ? Math.max(0, 1 - Math.hypot(x - 0.3, y - 0.6) * 9) * 0.5 : 0;
      const tone = 0.35 + rings * 0.35 + fibre * 0.3 - knot;
      return [tone, 0.45 + fibre * 0.4 + rings * 0.15];
    }
    case 'stone': {
      const body = fbm(noise, x, y, 5, 4);
      // Cracks: thin dark lines where a second noise crosses its middle
      const crack = 1 - Math.min(1, Math.abs(fbm(noise, x + 3.1, y + 7.7, 4, 3) - 0.5) * 22);
      const pits = fbm(noise, x * 2, y * 2, 2, 32) > 0.72 ? 0.25 : 0;
      return [Math.max(0, body * 0.85 + 0.1 - crack * 0.45 - pits), 0.55 + body * 0.35 + crack * 0.1];
    }
    case 'lacquer': {
      // Mostly smooth, with worn patches and fine scratches that catch the light
      const wear = fbm(noise, x, y, 4, 3);
      const scratch = Math.abs(Math.sin((x * 3 + y * 11 + fbm(noise, x, y, 2, 8) * 2) * 40)) > 0.985 ? 1 : 0;
      return [0.5 + (wear - 0.5) * 0.6 - scratch * 0.15, 0.2 + wear * 0.35 + scratch * 0.3];
    }
    case 'paper': {
      const fibres = fbm(noise, x * 4, y, 3, 16);
      const blot = fbm(noise, x, y, 3, 3);
      return [0.4 + fibres * 0.35 + blot * 0.25, 0.75 + fibres * 0.2];
    }
    case 'plaster': {
      const mottle = fbm(noise, x, y, 5, 3);
      const stain = Math.max(0, fbm(noise, x, y * 0.5 + 9, 3, 2) - 0.55) * 1.5;
      return [mottle * 0.8 + 0.2 - stain, 0.7 + mottle * 0.25];
    }
    case 'roof': {
      // Rows of overlapping tiles
      const row = (y * 10) % 1;
      const tile = ((x * 8 + Math.floor(y * 10) * 0.5) % 1);
      const edge = Math.min(row, 1 - row) < 0.08 || Math.min(tile, 1 - tile) < 0.04 ? 0.25 : 0;
      const grime = fbm(noise, x, y, 4, 4);
      return [0.35 + row * 0.35 + grime * 0.3 - edge, 0.45 + grime * 0.35];
    }
    case 'metal': {
      const brushed = fbm(noise, x * 0.2, y * 6, 3, 8);
      const rust = Math.max(0, fbm(noise, x, y, 4, 3) - 0.6) * 2;
      return [0.5 + brushed * 0.3 - rust * 0.5, 0.3 + brushed * 0.2 + rust * 0.5];
    }
    case 'soil': {
      const clumps = fbm(noise, x, y, 5, 6);
      const pebbles = fbm(noise, x * 3, y * 3, 2, 24) > 0.7 ? 0.2 : 0;
      return [clumps * 0.8 + 0.1 + pebbles, 0.75 + clumps * 0.2];
    }
  }
}

const textures = new Map<SurfaceKind, THREE.DataTexture>();

function detailTexture(kind: SurfaceKind): THREE.DataTexture {
  const cached = textures.get(kind);
  if (cached) return cached;
  const noise = makeNoise(1000 + Object.keys(STYLES).indexOf(kind) * 77);
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let j = 0; j < SIZE; j++) {
    for (let i = 0; i < SIZE; i++) {
      const [tone, rough] = sample(kind, noise, i / SIZE, j / SIZE);
      const o = (j * SIZE + i) * 4;
      data[o] = Math.max(0, Math.min(255, tone * 255));
      data[o + 1] = Math.max(0, Math.min(255, rough * 255));
      data[o + 2] = 0;
      data[o + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, SIZE, SIZE);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  textures.set(kind, texture);
  return texture;
}

// ─── The shader patch ────────────────────────────────────────────────────

const VERTEX_PARS = /* glsl */`
  varying vec3 vSurfWorld;
  varying vec3 vSurfNormal;
`;

const VERTEX_MAIN = /* glsl */`
  {
    vec4 surfWorld = vec4(transformed, 1.0);
    vec3 surfNormal = objectNormal;
    #ifdef USE_INSTANCING
      surfWorld = instanceMatrix * surfWorld;
      surfNormal = mat3(instanceMatrix) * surfNormal;
    #endif
    vSurfWorld = (modelMatrix * surfWorld).xyz;
    vSurfNormal = normalize(mat3(modelMatrix) * surfNormal);
  }
`;

const FRAGMENT_PARS = /* glsl */`
  uniform sampler2D uSurfDetail;
  uniform float uSurfScale;
  uniform float uSurfGrain;
  uniform float uSurfStrength;
  uniform float uSurfBump;
  uniform float uWetness;
  varying vec3 vSurfWorld;
  varying vec3 vSurfNormal;

  vec3 surfPerturbNormal(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
    vec3 sigmaX = normalize(dFdx(surfPos));
    vec3 sigmaY = normalize(dFdy(surfPos));
    vec3 r1 = cross(sigmaY, surfNorm);
    vec3 r2 = cross(surfNorm, sigmaX);
    float det = dot(sigmaX, r1) * faceDir;
    vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
    return normalize(abs(det) * surfNorm - grad);
  }
`;

const FRAGMENT_DETAIL = /* glsl */`
  vec3 surfN = normalize(vSurfNormal);
  vec3 surfW = pow(abs(surfN), vec3(4.0));
  surfW /= (surfW.x + surfW.y + surfW.z);
  vec3 surfP = vSurfWorld / uSurfScale;
  // On walls the grain runs up; on floors and tops it runs along x
  vec4 surfDetail = texture2D(uSurfDetail, vec2(surfP.z, surfP.y / uSurfGrain)) * surfW.x
    + texture2D(uSurfDetail, vec2(surfP.x, surfP.z / uSurfGrain)) * surfW.y
    + texture2D(uSurfDetail, vec2(surfP.x, surfP.y / uSurfGrain)) * surfW.z;
  diffuseColor.rgb *= mix(1.0 - uSurfStrength, 1.0 + uSurfStrength, surfDetail.r);
  // Wet surfaces darken, the tops of things most of all
  float surfWet = uWetness * (0.4 + 0.6 * smoothstep(0.2, 0.9, surfN.y));
  diffuseColor.rgb *= 1.0 - surfWet * 0.38;
`;

const FRAGMENT_ROUGHNESS = /* glsl */`
  roughnessFactor = clamp(roughnessFactor * mix(0.7, 1.3, surfDetail.g), 0.04, 1.0);
  // Rain leaves a sheen; the hollows in the surface hold water longest
  roughnessFactor = mix(roughnessFactor, 0.24 + surfDetail.r * 0.18, surfWet * 0.75);
`;

const FRAGMENT_NORMAL = /* glsl */`
  {
    vec2 surfDH = vec2(dFdx(surfDetail.r), dFdy(surfDetail.r)) * uSurfBump * (1.0 - surfWet * 0.5);
    normal = surfPerturbNormal(-vViewPosition, normal, surfDH, faceDirection);
  }
`;

const patched = new WeakSet<THREE.Material>();

/** Paints a surface onto a lit material. Safe to call more than once. */
export function applySurface(material: THREE.MeshStandardMaterial, kind: SurfaceKind, strength = 1): void {
  if (patched.has(material)) return;
  patched.add(material);
  const style = STYLES[kind];
  const previous = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey?.bind(material);

  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.uniforms.uSurfDetail = { value: detailTexture(kind) };
    shader.uniforms.uSurfScale = { value: style.scale };
    shader.uniforms.uSurfGrain = { value: style.grain };
    shader.uniforms.uSurfStrength = { value: style.strength * strength };
    shader.uniforms.uSurfBump = { value: style.bump * strength };
    shader.uniforms.uWetness = SurfaceUniforms.uWetness;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${VERTEX_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
      .replace('#include <map_fragment>', `#include <map_fragment>\n${FRAGMENT_DETAIL}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${FRAGMENT_ROUGHNESS}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${FRAGMENT_NORMAL}`);
  };
  material.customProgramCacheKey = () => `surface-${kind}-${previousKey ? previousKey() : ''}`;
  material.needsUpdate = true;
}

/** Guesses a surface from a material's colour: red lacquer, brown wood, grey stone and so on. */
export function guessSurface(material: THREE.MeshStandardMaterial): SurfaceKind {
  if (material.userData.surface) return material.userData.surface as SurfaceKind;
  if (material.metalness > 0.5) return 'metal';
  const hsl = { h: 0, s: 0, l: 0 };
  material.color.getHSL(hsl);
  if (material.emissiveIntensity > 0.3 && material.emissive.getHex() !== 0) return 'paper';
  if (hsl.s > 0.4 && (hsl.h < 0.05 || hsl.h > 0.93) && hsl.l > 0.12) return 'lacquer';
  if (hsl.l > 0.55 && hsl.s < 0.4) return 'paper';
  if (hsl.h >= 0.02 && hsl.h <= 0.14 && hsl.s > 0.18) return hsl.l > 0.3 ? 'plaster' : 'wood';
  if (hsl.s < 0.2 && hsl.l < 0.2) return 'roof';
  if (hsl.s < 0.28) return 'stone';
  return 'plaster';
}

/**
 * Paints every suitable material under `root` with its best-guess surface.
 * Skips glows, water, effects, and anything marked `userData.noSurface`.
 */
export function surfaceEverything(root: THREE.Object3D): void {
  root.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || mesh.userData.noSurface) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      if (material.transparent || material.userData.noSurface) continue;
      // Vertex-coloured ground and foliage get their own treatment
      if (material.vertexColors && !material.userData.surface) continue;
      applySurface(material, guessSurface(material));
    }
  });
}
