import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SeededRandom } from '../utils/MathUtils';
import { applyWind } from '../utils/Wind';

// All trees of a kind share these materials, and each tree is merged into two
// meshes (wood + leaves) to keep draw calls low.
const woodMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
const blossomMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  emissive: 0x3a0a1c,
  emissiveIntensity: 0.55,
});
const needleMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
applyWind(blossomMaterial, 0.045);
applyWind(needleMaterial, 0.02);

function paint(geometry: THREE.BufferGeometry, colorAt: (position: THREE.Vector3) => THREE.Color): void {
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const point = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    const color = colorAt(point);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.deleteAttribute('uv');
}

/** A bent limb that tapers from `start` towards its tip. */
function limb(random: SeededRandom, start: THREE.Vector3, direction: THREE.Vector3, length: number, radius: number): { geometry: THREE.BufferGeometry; tip: THREE.Vector3; path: THREE.CatmullRomCurve3 } {
  const points = [start.clone()];
  const heading = direction.clone().normalize();
  const steps = 4;
  for (let i = 1; i <= steps; i++) {
    heading.x += (random.next() - 0.5) * 0.5;
    heading.z += (random.next() - 0.5) * 0.5;
    heading.normalize();
    points.push(points[i - 1].clone().addScaledVector(heading, length / steps));
  }

  const path = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(path, 8, radius, 6, false);

  // Taper along the length by pulling each ring towards the spine
  const positions = geometry.attributes.position;
  const ringSize = 7;
  const spine = new THREE.Vector3();
  const point = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    const t = Math.floor(i / ringSize) / 8;
    path.getPoint(t, spine);
    point.fromBufferAttribute(positions, i).sub(spine).multiplyScalar(1 - t * 0.72).add(spine);
    positions.setXYZ(i, point.x, point.y, point.z);
  }
  geometry.computeVertexNormals();

  return { geometry, tip: points[points.length - 1], path };
}

/** One lumpy cloud of blossom, smooth-shaded so it reads as soft mass rather than a crystal. */
function blossomClump(random: SeededRandom, center: THREE.Vector3, size: number, detail: number): THREE.BufferGeometry {
  const base = new THREE.IcosahedronGeometry(1, detail);
  base.deleteAttribute('uv');
  base.deleteAttribute('normal');
  const geometry = mergeVertices(base);

  const positions = geometry.attributes.position;
  const point = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    point.multiplyScalar(0.8 + random.next() * 0.4);
    point.y *= 0.72;
    point.multiplyScalar(size).add(center);
    positions.setXYZ(i, point.x, point.y, point.z);
  }

  // Normals point straight out from the clump's centre, which hides the facets and
  // shades the whole thing like one soft ball of petals
  const normals = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i).sub(center).normalize();
    normals.set([point.x, point.y, point.z], i * 3);
  }
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return geometry;
}

function finishTree(wood: THREE.BufferGeometry[], leaves: THREE.BufferGeometry[], leafMaterial: THREE.Material): THREE.Group {
  const tree = new THREE.Group();

  const woodMesh = new THREE.Mesh(mergeGeometries(wood), woodMaterial);
  woodMesh.castShadow = true;
  woodMesh.receiveShadow = true;
  tree.add(woodMesh);

  if (leaves.length > 0) {
    const leafMesh = new THREE.Mesh(mergeGeometries(leaves), leafMaterial);
    leafMesh.castShadow = true;
    leafMesh.receiveShadow = true;
    tree.add(leafMesh);
  }
  return tree;
}

const barkColor = (base: number) => {
  const color = new THREE.Color();
  return (point: THREE.Vector3) => color.setHex(base).multiplyScalar(0.8 + Math.abs(Math.sin(point.y * 6 + point.x * 9)) * 0.45);
};

/** Gnarled sakura. Blossom is pale on top and deepens to rose underneath. */
export function buildSakura(random: SeededRandom, scale: number = 1, isHero: boolean = false): THREE.Group {
  const wood: THREE.BufferGeometry[] = [];
  const leaves: THREE.BufferGeometry[] = [];

  const trunkHeight = random.range(3.2, 4.2) * scale;
  const trunk = limb(random, new THREE.Vector3(), new THREE.Vector3(0, 1, 0), trunkHeight, 0.38 * scale);
  wood.push(trunk.geometry);

  const branchTips: THREE.Vector3[] = [];
  const branchCount = isHero ? 7 : 5;
  for (let b = 0; b < branchCount; b++) {
    const angle = (b / branchCount) * Math.PI * 2 + random.next();
    const start = trunk.path.getPoint(random.range(0.65, 1));
    const out = new THREE.Vector3(Math.cos(angle), random.range(0.35, 0.8), Math.sin(angle));
    const branch = limb(random, start, out, random.range(2.2, 3.4) * scale, 0.16 * scale);
    wood.push(branch.geometry);
    branchTips.push(branch.tip, branch.path.getPoint(0.65));

    // A smaller twig gives each branch a natural fork
    const twigStart = branch.path.getPoint(0.55);
    const twigOut = out.clone().add(new THREE.Vector3(random.range(-0.8, 0.8), 0.3, random.range(-0.8, 0.8)));
    const twig = limb(random, twigStart, twigOut, random.range(1.2, 2.0) * scale, 0.07 * scale);
    wood.push(twig.geometry);
    branchTips.push(twig.tip);
  }

  // Many small clumps spread along each branch read as blossom rather than one big mass
  for (const tip of branchTips) {
    const clumps = isHero ? 9 : 5;
    for (let c = 0; c < clumps; c++) {
      const spread = 1.5 * scale;
      const center = tip.clone().add(new THREE.Vector3(
        random.range(-spread, spread),
        random.range(-0.55, 0.7) * scale,
        random.range(-spread, spread),
      ));
      leaves.push(blossomClump(random, center, random.range(0.42, 0.85) * scale, 1));
    }
  }

  const canopyBottom = trunkHeight * 0.7;
  const canopyTop = trunkHeight + 3.5 * scale;
  const deep = new THREE.Color(0x8c2a58);
  const pale = new THREE.Color(0xffd2de);
  const color = new THREE.Color();
  for (const geometry of leaves) {
    // Each clump gets its own tone, with per-vertex speckle standing in for individual petals
    const clumpTone = random.range(-0.12, 0.12);
    paint(geometry, point => {
      const h = THREE.MathUtils.clamp((point.y - canopyBottom) / (canopyTop - canopyBottom), 0, 1);
      return color.copy(deep).lerp(pale, h * 0.9 + clumpTone + (random.next() - 0.5) * 0.28);
    });
  }
  const bark = barkColor(0x241717);
  for (const geometry of wood) paint(geometry, bark);

  return finishTree(wood, leaves, blossomMaterial);
}

/** Dark layered cedar for the cursed forest. */
export function buildCedar(random: SeededRandom, scale: number = 1): THREE.Group {
  const height = random.range(10, 15) * scale;
  const wood = [limb(random, new THREE.Vector3(), new THREE.Vector3(0, 1, 0), height, 0.34 * scale).geometry];
  const leaves: THREE.BufferGeometry[] = [];

  const layers = Math.floor(random.range(5, 8));
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    const radius = THREE.MathUtils.lerp(3.1, 0.9, t) * scale * random.range(0.9, 1.1);
    const layerHeight = THREE.MathUtils.lerp(3.2, 2.2, t) * scale;
    const cone = new THREE.ConeGeometry(radius, layerHeight, 9, 2);
    cone.deleteAttribute('uv');
    cone.deleteAttribute('normal');
    const geometry = mergeVertices(cone);

    // Jagged rim so layers read as boughs rather than perfect cones
    const positions = geometry.attributes.position;
    for (let v = 0; v < positions.count; v++) {
      if (positions.getY(v) < layerHeight * 0.4) {
        const jitter = 0.82 + random.next() * 0.4;
        positions.setX(v, positions.getX(v) * jitter);
        positions.setZ(v, positions.getZ(v) * jitter);
        positions.setY(v, positions.getY(v) - random.next() * 0.3);
      }
    }
    geometry.translate(0, height * (0.35 + t * 0.62), 0);
    geometry.computeVertexNormals();
    leaves.push(geometry);
  }

  const dark = new THREE.Color(0x0c1c1c);
  const light = new THREE.Color(0x24463d);
  const color = new THREE.Color();
  for (const geometry of leaves) {
    paint(geometry, point => color.copy(dark).lerp(light, THREE.MathUtils.clamp(point.y / height, 0, 1)));
  }
  const bark = barkColor(0x1c1512);
  for (const geometry of wood) paint(geometry, bark);

  return finishTree(wood, leaves, needleMaterial);
}

/** Leafless, blackened tree for the corrupted ground around the temple. */
export function buildDeadTree(random: SeededRandom, scale: number = 1): THREE.Group {
  const trunkHeight = random.range(4, 6) * scale;
  const trunk = limb(random, new THREE.Vector3(), new THREE.Vector3(0, 1, 0), trunkHeight, 0.3 * scale);
  const wood = [trunk.geometry];

  const branchCount = Math.floor(random.range(4, 7));
  for (let b = 0; b < branchCount; b++) {
    const angle = random.next() * Math.PI * 2;
    const start = trunk.path.getPoint(random.range(0.45, 1));
    const out = new THREE.Vector3(Math.cos(angle), random.range(0.2, 0.9), Math.sin(angle));
    const branch = limb(random, start, out, random.range(1.8, 3.6) * scale, 0.1 * scale);
    wood.push(branch.geometry);

    const twigOut = out.clone().add(new THREE.Vector3(random.range(-1, 1), 0.2, random.range(-1, 1)));
    wood.push(limb(random, branch.path.getPoint(0.6), twigOut, random.range(0.8, 1.6) * scale, 0.05 * scale).geometry);
  }

  const bark = barkColor(0x1d1214);
  for (const geometry of wood) paint(geometry, bark);
  return finishTree(wood, [], blossomMaterial);
}
