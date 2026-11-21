import * as THREE from 'three';

/**
 * Decals — Marks painted onto the world: scorch marks and soot where fire has
 * been, blood where the fighting was worst, damp stains where the flood rose.
 * Each is a soft, irregular shape drawn once onto a canvas, and laid flat on
 * the ground or against a wall.
 */
export type DecalKind = 'scorch' | 'soot' | 'blood' | 'damp';

const SIZE = 256;
const cache = new Map<DecalKind, THREE.CanvasTexture[]>();

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function blob(ctx: CanvasRenderingContext2D, random: () => number, cx: number, cy: number, radius: number, color: string, wobble: number): void {
  ctx.beginPath();
  const points = 18;
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = radius * (1 - wobble / 2 + random() * wobble);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function draw(kind: DecalKind, seed: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const random = rng(seed);
  const c = SIZE / 2;

  if (kind === 'scorch') {
    // A charred core, ragged edges, and a faint ring of heat-browned ground
    ctx.filter = 'blur(10px)';
    blob(ctx, random, c, c, 110, 'rgba(40,22,10,0.45)', 0.5);
    ctx.filter = 'blur(5px)';
    blob(ctx, random, c, c, 82, 'rgba(10,8,6,0.85)', 0.6);
    ctx.filter = 'none';
    for (let i = 0; i < 14; i++) {
      const a = random() * Math.PI * 2;
      const r = 20 + random() * 60;
      blob(ctx, random, c + Math.cos(a) * r, c + Math.sin(a) * r, 8 + random() * 22, 'rgba(4,3,2,0.7)', 0.8);
    }
  } else if (kind === 'soot') {
    // Rising black streaks, for a wall above a fire: densest at the bottom
    const gradient = ctx.createLinearGradient(0, SIZE, 0, 0);
    gradient.addColorStop(0, 'rgba(8,6,5,0.85)');
    gradient.addColorStop(0.6, 'rgba(10,8,6,0.4)');
    gradient.addColorStop(1, 'rgba(10,8,6,0)');
    ctx.filter = 'blur(6px)';
    for (let i = 0; i < 9; i++) {
      const x = 40 + random() * 176;
      const w = 18 + random() * 40;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(x - w, SIZE);
      ctx.quadraticCurveTo(x + (random() - 0.5) * 60, SIZE * 0.4, x + (random() - 0.5) * 30, random() * 60);
      ctx.quadraticCurveTo(x + (random() - 0.5) * 60, SIZE * 0.4, x + w, SIZE);
      ctx.fill();
    }
    ctx.filter = 'none';
  } else if (kind === 'blood') {
    // A pool with a darker heart, and spatter thrown out to one side
    const angle = random() * Math.PI * 2;
    blob(ctx, random, c, c, 46 + random() * 20, 'rgba(140,10,16,0.92)', 0.45);
    blob(ctx, random, c + 4, c - 3, 26, 'rgba(80,2,8,0.85)', 0.5);
    for (let i = 0; i < 26; i++) {
      const spread = (random() - 0.5) * 1.1;
      const r = 50 + random() * 70;
      const x = c + Math.cos(angle + spread) * r;
      const y = c + Math.sin(angle + spread) * r;
      blob(ctx, random, x, y, 2 + random() * 7 * (1 - (r - 50) / 90), 'rgba(150,12,18,0.92)', 0.6);
    }
  } else {
    // A tide line of dark, damp stain
    ctx.filter = 'blur(8px)';
    blob(ctx, random, c, c, 105, 'rgba(10,16,14,0.5)', 0.35);
    ctx.filter = 'none';
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Embers still smouldering in a scorch mark: orange specks, black elsewhere. */
let emberTexture: THREE.CanvasTexture | null = null;
function embers(): THREE.CanvasTexture {
  if (emberTexture) return emberTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SIZE, SIZE);
  const random = rng(911);
  ctx.filter = 'blur(2px)';
  for (let i = 0; i < 70; i++) {
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * 80;
    blob(ctx, random, SIZE / 2 + Math.cos(a) * r, SIZE / 2 + Math.sin(a) * r, 1.5 + random() * 4, `rgba(255,${120 + random() * 80},40,${0.5 + random() * 0.5})`, 0.7);
  }
  emberTexture = new THREE.CanvasTexture(canvas);
  emberTexture.colorSpace = THREE.SRGBColorSpace;
  return emberTexture;
}

/** A few drawings of each kind, so repeats don't stand out. */
function variant(kind: DecalKind, index: number): THREE.CanvasTexture {
  let list = cache.get(kind);
  if (!list) {
    list = [0, 1, 2].map(i => draw(kind, 4000 + i * 97 + kind.length * 13));
    cache.set(kind, list);
  }
  return list[index % list.length];
}

const geometry = new THREE.PlaneGeometry(1, 1);

/**
 * A decal mesh. Flat on the ground by default; pass a `normal` to stand it
 * against a wall facing that way.
 */
export function createDecal(kind: DecalKind, position: THREE.Vector3, size: number, options: { rotation?: number; normal?: THREE.Vector3; variant?: number } = {}): THREE.Mesh {
  const isWet = kind === 'blood';
  const material = new THREE.MeshStandardMaterial({
    map: variant(kind, options.variant ?? Math.floor(Math.random() * 3)),
    transparent: true,
    depthWrite: false,
    roughness: isWet ? 0.3 : 1,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  material.userData.noSurface = true;
  if (kind === 'scorch') {
    material.emissive = new THREE.Color(0xff5a1a);
    material.emissiveMap = embers();
    material.emissiveIntensity = 1.6;
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(size, size, 1);
  mesh.position.copy(position);
  const normal = options.normal ?? new THREE.Vector3(0, 1, 0);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
  mesh.rotateZ(options.rotation ?? Math.random() * Math.PI * 2);
  mesh.position.addScaledVector(normal, 0.02);
  mesh.renderOrder = 1;
  mesh.userData.noAO = true;
  mesh.userData.noShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
