import * as THREE from 'three';
import { SeededRandom } from '../utils/MathUtils';
import { applySway, applyTranslucency } from '../utils/Wind';
import { applySurface } from '../rendering/Surfaces';
import { SettingsManager } from '../settings/SettingsManager';

/**
 * BambooGrove — Bamboo that grows the way bamboo does: in clumps, never in
 * rows; culms of every thickness, jointed, tapering and leaning; leaves
 * hanging in drooping sprays from the upper half; dwarf bamboo crowding the
 * base so the grove reads as one green wall, not a line of bars. Shoots push
 * up between them and dry leaves carpet the ground.
 */

export interface Culm {
  x: number;
  z: number;
  height: number;
  radius: number;
  /** The way it leans, and how far, in radians. */
  leanX: number;
  leanZ: number;
  lean: number;
  isDry: boolean;
}

const NODES = 8;

/** A jointed culm, base at 0 and tip at 1, with a ridge and a pale waxy band at every node. */
function culmGeometry(): THREE.BufferGeometry {
  const profile: THREE.Vector2[] = [];
  const shades: number[] = [];
  for (let k = 0; k <= NODES; k++) {
    // Internodes run longer up the middle of a culm than at its base
    const y = Math.pow(k / NODES, 0.92);
    const taper = 1 - y * 0.5;
    if (k > 0) {
      profile.push(new THREE.Vector2(0.99 * taper, Math.max(0, y - 0.022)));
      shades.push(1.25);
    }
    profile.push(new THREE.Vector2((k === 0 ? 1.05 : 1.13) * taper, y));
    shades.push(0.62);
    if (k < NODES) {
      profile.push(new THREE.Vector2(1.0 * taper, y + 0.014));
      shades.push(0.9);
    }
  }
  const geometry = new THREE.LatheGeometry(profile, 6);
  // Shade each ring of the lathe the same as the profile point it came from
  const colors: number[] = [];
  const rings = profile.length;
  const count = geometry.getAttribute('position').count;
  for (let i = 0; i < count; i++) {
    const shade = shades[i % rings];
    colors.push(shade, shade, shade);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

/** A drooping spray of bamboo leaves on a thin twig, painted once. */
function leafTexture(isDry: boolean): THREE.CanvasTexture {
  const width = 256;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const random = new SeededRandom(isDry ? 913 : 517);

  // The twig
  ctx.strokeStyle = isDry ? '#6a5a32' : '#4a5a22';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(128, 0);
  ctx.quadraticCurveTo(110, 160, 140, 300);
  ctx.stroke();

  const along = (t: number): [number, number] => {
    const u = 1 - t;
    return [u * u * 128 + 2 * u * t * 110 + t * t * 140, 2 * u * t * 160 + t * t * 300];
  };

  const leaves = 11;
  for (let i = 0; i < leaves; i++) {
    const t = 0.08 + (i / (leaves - 1)) * 0.92;
    const [x, y] = along(t);
    const side = i % 2 === 0 ? 1 : -1;
    // Leaves hang down and out from the twig, longest in the middle of the spray
    const angle = Math.PI / 2 + side * random.range(0.25, 0.85);
    const length = random.range(130, 200) * (0.75 + Math.sin(t * Math.PI) * 0.35);
    const w = random.range(15, 22);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle - Math.PI / 2);
    const gradient = ctx.createLinearGradient(-w, 0, w, 0);
    if (isDry) {
      gradient.addColorStop(0, '#7a6a3a');
      gradient.addColorStop(0.5, '#a8925a');
      gradient.addColorStop(1, '#6a5a30');
    } else {
      const g = random.range(0.85, 1.1);
      gradient.addColorStop(0, `rgb(${46 * g},${86 * g},${30 * g})`);
      gradient.addColorStop(0.5, `rgb(${88 * g},${132 * g},${52 * g})`);
      gradient.addColorStop(1, `rgb(${40 * g},${76 * g},${26 * g})`);
    }
    ctx.fillStyle = gradient;
    // A lance: narrow at the stem, widest a third of the way, drawn out to a point
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(w, length * 0.18, w * 0.9, length * 0.55, 0, length);
    ctx.bezierCurveTo(-w * 0.9, length * 0.55, -w, length * 0.18, 0, 0);
    ctx.fill();
    ctx.strokeStyle = isDry ? 'rgba(220,200,150,0.35)' : 'rgba(190,220,150,0.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(0, length * 0.92);
    ctx.stroke();
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Fallen leaves, dry and scattered, for the ground under a grove. */
function litterTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const random = new SeededRandom(77);
  for (let i = 0; i < 46; i++) {
    const x = random.range(20, 236);
    const y = random.range(20, 236);
    const length = random.range(26, 52);
    const w = random.range(4, 7);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(random.next() * Math.PI * 2);
    const tone = random.range(0.6, 1.1);
    ctx.fillStyle = random.next() < 0.25
      ? `rgba(${70 * tone},${80 * tone},${40 * tone},0.95)`
      : `rgba(${120 * tone},${100 * tone},${62 * tone},0.95)`;
    ctx.beginPath();
    ctx.moveTo(0, -length / 2);
    ctx.quadraticCurveTo(w, 0, 0, length / 2);
    ctx.quadraticCurveTo(-w, 0, 0, -length / 2);
    ctx.fill();
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Plants clumps of culms. Each call to `clump` adds one clump at a spot;
 * `build` turns everything added to one batch into meshes.
 */
export class BambooGrove {
  private culmGeo = culmGeometry();
  private sprayGeo: THREE.BufferGeometry;
  private shootGeo = new THREE.ConeGeometry(1, 1, 6, 1).translate(0, 0.5, 0);
  private litterGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  public readonly culmMaterial: THREE.MeshStandardMaterial;
  public readonly leafMaterial: THREE.MeshStandardMaterial;
  public readonly dryLeafMaterial: THREE.MeshStandardMaterial;
  public readonly underMaterial: THREE.MeshStandardMaterial;
  private shootMaterial: THREE.MeshStandardMaterial;
  private litterMaterial: THREE.MeshStandardMaterial;
  private textures: THREE.Texture[] = [];

  constructor(private readonly random: SeededRandom) {
    // A spray hangs from its top edge and curls forward towards its tips
    const spray = new THREE.PlaneGeometry(1, 1, 2, 4);
    spray.translate(0, -0.5, 0);
    const p = spray.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const y = -p.getY(i);
      p.setZ(i, y * y * 0.35 + Math.abs(p.getX(i)) * 0.12);
    }
    spray.computeVertexNormals();
    this.sprayGeo = spray;

    this.culmMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, vertexColors: true });
    this.culmMaterial.userData.surface = 'bamboo';
    applySurface(this.culmMaterial, 'bamboo');
    applySway(this.culmMaterial, 0.32);

    const leaf = leafTexture(false);
    const dry = leafTexture(true);
    this.textures.push(leaf, dry);
    const leafMaterial = (map: THREE.Texture, amp: number, translucency: number) => {
      const material = new THREE.MeshStandardMaterial({ map, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.7, color: 0xffffff });
      material.userData.noSurface = true;
      applySway(material, amp, true);
      applyTranslucency(material, translucency);
      return material;
    };
    this.leafMaterial = leafMaterial(leaf, 0.28, 0.9);
    this.dryLeafMaterial = leafMaterial(dry, 0.28, 0.6);
    this.underMaterial = leafMaterial(leaf, 0.06, 0.7);

    this.shootMaterial = new THREE.MeshStandardMaterial({ color: 0x6a5232, roughness: 0.85, flatShading: true });
    const litter = litterTexture();
    this.textures.push(litter);
    this.litterMaterial = new THREE.MeshStandardMaterial({
      map: litter, alphaTest: 0.5, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    this.litterMaterial.userData.noSurface = true;
  }

  /**
   * A clump of one to six culms around a spot. `away` is the direction the
   * clump leans towards, out of the wall it grows in, if it has one.
   */
  public clump(into: Culm[], x: number, z: number, options: { away?: [number, number]; tall?: [number, number] } = {}): void {
    const r = this.random;
    const roll = r.next();
    const count = roll < 0.18 ? 1 : roll < 0.42 ? 2 : roll < 0.66 ? 3 : roll < 0.84 ? 4 : roll < 0.95 ? 5 : 6;
    const tall = options.tall ?? [7, 11];
    const clumpHeight = r.range(tall[0], tall[1]);
    for (let i = 0; i < count; i++) {
      const a = r.next() * Math.PI * 2;
      const d = count === 1 ? 0 : r.range(0.05, 0.42);
      const cx = x + Math.cos(a) * d;
      const cz = z + Math.sin(a) * d;
      // Culms splay out from their clump, and lean a little out of the wall
      let lx = Math.cos(a) * 0.6 + r.range(-0.5, 0.5);
      let lz = Math.sin(a) * 0.6 + r.range(-0.5, 0.5);
      if (options.away) {
        lx += options.away[0] * 0.6;
        lz += options.away[1] * 0.6;
      }
      const length = Math.hypot(lx, lz) || 1;
      const isArching = r.next() < 0.035;
      const thick = r.next();
      into.push({
        x: cx, z: cz,
        height: clumpHeight * r.range(0.72, 1.12) * (0.85 + thick * 0.3),
        radius: 0.045 + thick * thick * 0.1,
        leanX: lx / length, leanZ: lz / length,
        lean: isArching ? r.range(0.3, 0.45) : r.range(0.015, 0.11),
        isDry: r.next() < 0.09,
      });
    }
  }

  /** One batch of the grove as a group of meshes: culms, leaves, undergrowth. */
  public build(culms: Culm[], name: string): THREE.Group {
    const r = this.random;
    const group = new THREE.Group();
    group.name = name;
    if (culms.length === 0) return group;

    const up = new THREE.Vector3(0, 1, 0);
    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const yaw = new THREE.Quaternion();
    const dir = new THREE.Vector3();
    const tint = new THREE.Color();

    // Low quality keeps the shape of the grove with about half the leaves, and no leaf shadows
    const isLow = SettingsManager.getInstance().get().graphicsQuality === 'LOW';
    const leafShare = isLow ? 0.5 : 1;
    const culmMesh = new THREE.InstancedMesh(this.culmGeo, this.culmMaterial, culms.length);
    const sprays: { m: THREE.Matrix4; c: THREE.Color; dry: boolean }[] = [];
    const under: { m: THREE.Matrix4; c: THREE.Color }[] = [];

    culms.forEach((c, i) => {
      dir.set(c.leanX * Math.sin(c.lean), Math.cos(c.lean), c.leanZ * Math.sin(c.lean)).normalize();
      q.setFromUnitVectors(up, dir);
      yaw.setFromAxisAngle(up, r.next() * Math.PI * 2);
      q.multiply(yaw);
      matrix.compose(new THREE.Vector3(c.x, -0.05, c.z), q, new THREE.Vector3(c.radius, c.height, c.radius));
      culmMesh.setMatrixAt(i, matrix);
      if (c.isDry) tint.setHSL(0.11 + r.range(-0.01, 0.02), 0.32, r.range(0.36, 0.44));
      else tint.setHSL(0.23 + r.range(-0.03, 0.04), r.range(0.3, 0.48), r.range(0.24, 0.38) - c.radius * 0.4);
      culmMesh.setColorAt(i, tint);

      // Sprays of leaves hanging off the upper half
      const count = Math.round(((c.isDry ? 2 : 5) + c.height * 0.35 + r.range(0, 3)) * leafShare);
      for (let k = 0; k < count; k++) {
        const along = 0.42 + Math.pow(r.next(), 0.6) * 0.56;
        const at = new THREE.Vector3(c.x, 0, c.z).addScaledVector(dir, c.height * along);
        const sprayQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(r.range(-0.15, 0.55), r.next() * Math.PI * 2, r.range(-0.3, 0.3), 'YXZ'));
        const size = r.range(0.9, 1.6) * (0.7 + along * 0.5);
        sprays.push({
          m: new THREE.Matrix4().compose(at, sprayQ, new THREE.Vector3(size * 0.75, size * 1.25, size)),
          c: new THREE.Color().setHSL(0.25 + r.range(-0.04, 0.04), r.range(0.5, 0.75), r.range(0.42, 0.62)),
          dry: c.isDry,
        });
      }
    });

    // Dwarf bamboo crowding the foot of each clump: sprays turned up, so the base is a thicket
    const seen = new Set<string>();
    for (const c of culms) {
      const key = `${Math.round(c.x * 1.2)},${Math.round(c.z * 1.2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const tufts = Math.round((2 + Math.floor(r.next() * 3)) * leafShare);
      for (let k = 0; k < tufts; k++) {
        const at = new THREE.Vector3(c.x + r.range(-0.6, 0.6), r.range(0.02, 0.4), c.z + r.range(-0.6, 0.6));
        const tuftQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI + r.range(-0.5, 0.5), r.next() * Math.PI * 2, r.range(-0.4, 0.4), 'YXZ'));
        const size = r.range(0.9, 1.5);
        under.push({
          m: new THREE.Matrix4().compose(at, tuftQ, new THREE.Vector3(size, size * 1.1, size)),
          c: new THREE.Color().setHSL(0.24 + r.range(-0.03, 0.05), r.range(0.45, 0.65), r.range(0.28, 0.42)),
        });
      }
    }

    const addInstances = (list: { m: THREE.Matrix4; c: THREE.Color }[], material: THREE.Material, castShadow: boolean) => {
      if (list.length === 0) return;
      const mesh = new THREE.InstancedMesh(this.sprayGeo, material, list.length);
      list.forEach((s, i) => {
        mesh.setMatrixAt(i, s.m);
        mesh.setColorAt(i, s.c);
      });
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      if (!castShadow) mesh.userData.noShadow = true;
      // The culms decide whether a row is in the camera's way; the leaves needn't be tested too
      mesh.raycast = () => {};
      group.add(mesh);
    };
    group.add(culmMesh);
    addInstances(sprays.filter(s => !s.dry), this.leafMaterial, !isLow);
    addInstances(sprays.filter(s => s.dry), this.dryLeafMaterial, !isLow);
    addInstances(under, this.underMaterial, false);
    return group;
  }

  /** Shoots pushing up through the leaf litter. */
  public shoots(spots: [number, number][]): THREE.InstancedMesh {
    const r = this.random;
    const mesh = new THREE.InstancedMesh(this.shootGeo, this.shootMaterial, spots.length);
    const matrix = new THREE.Matrix4();
    const tint = new THREE.Color();
    spots.forEach(([x, z], i) => {
      const h = r.range(0.25, 0.7);
      matrix.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r.range(-0.15, 0.15), r.next() * 6, r.range(-0.15, 0.15))),
        new THREE.Vector3(h * 0.22, h, h * 0.22));
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, tint.setHSL(0.08 + r.range(0, 0.04), 0.4, r.range(0.22, 0.34)));
    });
    mesh.raycast = () => {};
    return mesh;
  }

  /** Dry leaves carpeting the ground. */
  public litter(spots: [number, number][]): THREE.InstancedMesh {
    const r = this.random;
    const mesh = new THREE.InstancedMesh(this.litterGeo, this.litterMaterial, spots.length);
    const matrix = new THREE.Matrix4();
    const tint = new THREE.Color();
    spots.forEach(([x, z], i) => {
      const size = r.range(1.4, 2.6);
      matrix.compose(new THREE.Vector3(x, 0.02, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r.next() * 6.3), new THREE.Vector3(size, 1, size));
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, tint.setHSL(0.1, 0.25, r.range(0.4, 0.62)));
    });
    mesh.userData.noShadow = true;
    mesh.receiveShadow = true;
    mesh.raycast = () => {};
    return mesh;
  }

  public dispose(): void {
    this.culmGeo.dispose();
    this.sprayGeo.dispose();
    this.shootGeo.dispose();
    this.litterGeo.dispose();
    for (const t of this.textures) t.dispose();
  }
}
