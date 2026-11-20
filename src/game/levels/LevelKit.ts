import * as THREE from 'three';
import { CollisionSystem } from '../collision/CollisionSystem';
import { LightSource, createGlowSprite, createLightPool } from '../lighting/WorldLights';
import { ToriiGenerator } from '../world/ToriiGenerator';
import { SeededRandom } from '../utils/MathUtils';
import { createSurfaceTextures } from '../utils/ProceduralTextures';
import { Rect, inRect } from './LevelTypes';
import { mergeStatic } from '../utils/MergeStatic';
import { LightShafts, ShaftOptions, createHaloSprite } from '../rendering/LightShafts';
import { HeatSource, HeatSources } from '../rendering/HeatSources';
import { getGlowTexture } from '../utils/ProceduralTextures';

/**
 * LevelKit — Shared pieces for building the later levels: ground, buildings,
 * decks and ramps, water, lanterns, gates. A LevelBuilder keeps track of the
 * colliders, lights and floor heights as it goes.
 */

export const std = (color: number, options: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...options });

interface Deck { rect: Rect; height: number }
interface Ramp { rect: Rect; axis: 'x' | 'z'; from: number; to: number }
interface Footing { rect: Rect; factor: number }

/** The gate onward, sealed until the level's boss falls. */
export interface ExitGate {
  group: THREE.Group;
  setOpen: (isOpen: boolean) => void;
  update: (time: number) => void;
}

export class LevelBuilder {
  public readonly group = new THREE.Group();
  public readonly lights: LightSource[] = [];
  public readonly occluders: THREE.Object3D[] = [];
  public readonly random: SeededRandom;
  private decks: Deck[] = [];
  private ramps: Ramp[] = [];
  private footings: Footing[] = [];
  private animated: ((time: number, dt: number) => void)[] = [];
  private disposables = new Set<{ dispose: () => void }>();
  private shaftSets: LightShafts[] = [];
  private heat: HeatSource[] = [];

  constructor(name: string, public readonly collision: CollisionSystem, seed: number) {
    this.group.name = name;
    this.random = new SeededRandom(seed);
  }

  // ─── Queries ────────────────────────────────────────────────────────────

  /** Floor height: ramps first, then the highest deck underfoot, then the ground. */
  public heightAt = (x: number, z: number): number => {
    for (const ramp of this.ramps) {
      if (!inRect(ramp.rect, x, z)) continue;
      const t = ramp.axis === 'x'
        ? (x - ramp.rect.minX) / (ramp.rect.maxX - ramp.rect.minX)
        : (z - ramp.rect.minZ) / (ramp.rect.maxZ - ramp.rect.minZ);
      return THREE.MathUtils.lerp(ramp.from, ramp.to, THREE.MathUtils.clamp(t, 0, 1));
    }
    let height = 0;
    for (const deck of this.decks) if (deck.height > height && inRect(deck.rect, x, z)) height = deck.height;
    return height;
  };

  /** Slowest footing underfoot, ignored while standing up on a deck. */
  public footingAt = (x: number, z: number): number => {
    if (this.heightAt(x, z) > 0.25) return 1;
    let factor = 1;
    for (const f of this.footings) if (f.factor < factor && inRect(f.rect, x, z)) factor = f.factor;
    return factor;
  };

  /** Runs everything the level animates: water, flames, gates, and beams turning to the camera. */
  public tick(time: number, dt: number, camera?: THREE.Camera): void {
    for (const animate of this.animated) animate(time, dt);
    if (camera) for (const shafts of this.shaftSets) shafts.update(time, camera);
  }

  /** A set of light beams; add each with `.add(groundPoint)`. */
  public shafts(options: ShaftOptions): LightShafts {
    const shafts = new LightShafts(options);
    this.group.add(shafts.group);
    this.shaftSets.push(shafts);
    return shafts;
  }

  public onTick(animate: (time: number, dt: number) => void): void {
    this.animated.push(animate);
  }

  public dispose(): void {
    this.group.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach(m => m.dispose());
      else material?.dispose();
    });
    for (const item of this.disposables) item.dispose();
    for (const shafts of this.shaftSets) shafts.dispose();
    for (const source of this.heat) HeatSources.remove(source);
    this.group.removeFromParent();
  }

  /**
   * Every mesh casts and receives shadows, then static meshes sharing a material
   * are merged to save draw calls. Call once the level is built.
   */
  public finish(): void {
    this.group.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.noShadow) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    mergeStatic(this.group, this.occluders);
  }

  // ─── Primitives ─────────────────────────────────────────────────────────

  public mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0, parent: THREE.Object3D = this.group): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  /** A box resting on the ground, optionally solid. */
  public box(x: number, z: number, sx: number, sy: number, sz: number, material: THREE.Material, options: { y?: number; solid?: boolean; rotY?: number; parent?: THREE.Object3D } = {}): THREE.Mesh {
    const y = options.y ?? 0;
    const mesh = this.mesh(new THREE.BoxGeometry(sx, sy, sz), material, x, y + sy / 2, z, options.parent);
    if (options.rotY) mesh.rotation.y = options.rotY;
    if (options.solid) this.solid(x, z, sx, sz, options.rotY ?? 0);
    return mesh;
  }

  /** A solid footprint. Rotated footprints use their bounding box. */
  public solid(x: number, z: number, sx: number, sz: number, rotY: number = 0): void {
    const c = Math.abs(Math.cos(rotY));
    const s = Math.abs(Math.sin(rotY));
    const w = sx * c + sz * s;
    const d = sx * s + sz * c;
    this.collision.addBox(new THREE.Box3(new THREE.Vector3(x - w / 2, 0, z - d / 2), new THREE.Vector3(x + w / 2, 8, z + d / 2)));
  }

  public pillar(x: number, z: number, radius: number): void {
    this.collision.addSphere(new THREE.Vector3(x, 0, z), radius);
  }

  /** A real light from the shared pool, plus a glow that's always there. */
  public light(x: number, y: number, z: number, color: number, intensity: number, range: number, flicker = 0.12, glowSize = 1.6): void {
    this.lights.push({ position: new THREE.Vector3(x, y, z), color: new THREE.Color(color), intensity, range, flicker, phase: this.lights.length * 1.7 });
    const sprite = createGlowSprite(color, glowSize, 0.75);
    sprite.position.set(x, y, z);
    this.group.add(sprite);
    // The lit air around it, wide and faint
    const halo = createHaloSprite(color, glowSize * 4.5, getGlowTexture());
    halo.position.set(x, y, z);
    this.group.add(halo);
    const pool = createLightPool(color, range * 0.35, 0.18);
    pool.position.set(x, 0.06, z);
    pool.userData.noShadow = true;
    this.group.add(pool);
  }

  // ─── Ground ─────────────────────────────────────────────────────────────

  /** A broad plane with blotches of two colours, so it doesn't read as flat. */
  public ground(rect: Rect, colorA: number, colorB: number, seed: number): THREE.Mesh {
    const width = rect.maxX - rect.minX;
    const depth = rect.maxZ - rect.minZ;
    const geometry = new THREE.PlaneGeometry(width, depth, Math.ceil(width / 2), Math.ceil(depth / 2));
    geometry.rotateX(-Math.PI / 2);
    const colors: number[] = [];
    const a = new THREE.Color(colorA);
    const b = new THREE.Color(colorB);
    const c = new THREE.Color();
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const n = Math.sin(x * 0.21 + seed) * Math.cos(z * 0.17 - seed) * 0.5 + Math.sin(x * 0.05 + z * 0.07 + seed * 2) * 0.5;
      c.copy(a).lerp(b, THREE.MathUtils.clamp(n * 0.5 + 0.5, 0, 1));
      colors.push(c.r, c.g, c.b);
      position.setY(i, (Math.sin(x * 0.4 + seed) + Math.cos(z * 0.33)) * 0.03);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const textures = createSurfaceTextures([64, 16], seed, 2.2);
    for (const t of [textures.map, textures.normalMap]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(width / 8, depth / 8);
      this.disposables.add(t);
    }
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.map, normalMap: textures.normalMap, roughness: 0.95 });
    const mesh = this.mesh(geometry, material, (rect.minX + rect.maxX) / 2, 0, (rect.minZ + rect.maxZ) / 2);
    mesh.userData.noShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  /** Low walls of rock or earth closing off the level's edges. */
  public boundaryCliffs(rect: Rect, material: THREE.Material, height = 6): void {
    const r = this.random;
    const edges: [number, number, number, number][] = [
      [rect.minX, rect.minZ, rect.minX, rect.maxZ],
      [rect.maxX, rect.minZ, rect.maxX, rect.maxZ],
      [rect.minX, rect.minZ, rect.maxX, rect.minZ],
      [rect.minX, rect.maxZ, rect.maxX, rect.maxZ],
    ];
    for (const [x0, z0, x1, z1] of edges) {
      const length = Math.hypot(x1 - x0, z1 - z0);
      const count = Math.ceil(length / 5);
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const x = THREE.MathUtils.lerp(x0, x1, t);
        const z = THREE.MathUtils.lerp(z0, z1, t);
        const size = r.range(3, 5.5);
        const rock = this.mesh(new THREE.DodecahedronGeometry(size, 0), material, x, r.range(height * 0.2, height * 0.5), z);
        rock.scale.set(1, r.range(0.9, 1.6), 1);
        rock.rotation.set(r.range(0, 3), r.range(0, 3), r.range(0, 3));
      }
    }
  }

  public rock(x: number, z: number, size: number, material: THREE.Material, solid = true): THREE.Mesh {
    const r = this.random;
    const rock = this.mesh(new THREE.DodecahedronGeometry(size, 0), material, x, size * 0.45, z);
    rock.scale.set(r.range(0.9, 1.3), r.range(0.6, 1), r.range(0.9, 1.3));
    rock.rotation.set(r.range(0, 3), r.range(0, 3), r.range(0, 3));
    if (solid) this.pillar(x, z, size * 0.95);
    return rock;
  }

  // ─── Floors ─────────────────────────────────────────────────────────────

  /** A raised wooden floor on posts. Walkable, at its own height. */
  public deck(rect: Rect, height: number, material: THREE.Material, postMaterial: THREE.Material = material): void {
    const w = rect.maxX - rect.minX;
    const d = rect.maxZ - rect.minZ;
    const cx = (rect.minX + rect.maxX) / 2;
    const cz = (rect.minZ + rect.maxZ) / 2;
    this.box(cx, cz, w, 0.18, d, material, { y: height - 0.18 });
    // Planks, for a little texture
    const planks = Math.floor(w / 0.6);
    for (let i = 0; i < planks; i++) {
      if (i % 3 !== 0) continue;
      this.box(rect.minX + (i + 0.5) * (w / planks), cz, 0.04, 0.02, d, std(0x1a120c), { y: height });
    }
    for (const px of [rect.minX + 0.2, rect.maxX - 0.2]) {
      for (let z = rect.minZ + 0.2; z <= rect.maxZ; z += 2.6) {
        this.box(px, z, 0.2, height, 0.2, postMaterial);
      }
    }
    this.decks.push({ rect, height });
  }

  /** A slope between two heights, running along x or z. */
  public ramp(rect: Rect, axis: 'x' | 'z', from: number, to: number, material: THREE.Material): void {
    const w = rect.maxX - rect.minX;
    const d = rect.maxZ - rect.minZ;
    const run = axis === 'x' ? w : d;
    const rise = to - from;
    const length = Math.hypot(run, rise);
    const geometry = new THREE.BoxGeometry(axis === 'x' ? length : w, 0.16, axis === 'z' ? length : d);
    const mesh = this.mesh(geometry, material, (rect.minX + rect.maxX) / 2, (from + to) / 2 - 0.08, (rect.minZ + rect.maxZ) / 2);
    const angle = Math.atan2(rise, run);
    if (axis === 'x') mesh.rotation.z = angle;
    else mesh.rotation.x = -angle;
    this.ramps.push({ rect, axis, from, to });
  }

  /** Water that slows anyone wading through it. */
  public water(rect: Rect, color: number, factor: number): THREE.Mesh {
    const w = rect.maxX - rect.minX;
    const d = rect.maxZ - rect.minZ;
    const textures = createSurfaceTextures([32, 8], 913, 3);
    const normal = textures.normalMap;
    normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
    normal.repeat.set(w / 6, d / 6);
    textures.map.dispose();
    this.disposables.add(normal);
    const material = new THREE.MeshStandardMaterial({
      color, roughness: 0.08, metalness: 0.55, transparent: true, opacity: 0.78,
      normalMap: normal, normalScale: new THREE.Vector2(0.6, 0.6),
    });
    const geometry = new THREE.PlaneGeometry(w, d);
    geometry.rotateX(-Math.PI / 2);
    const mesh = this.mesh(geometry, material, (rect.minX + rect.maxX) / 2, 0.14, (rect.minZ + rect.maxZ) / 2);
    mesh.userData.noShadow = true;
    mesh.receiveShadow = true;
    this.onTick(time => {
      normal.offset.set(time * 0.02, time * 0.035);
    });
    this.footings.push({ rect, factor });
    return mesh;
  }

  /** A floor height with nothing drawn, for floors built some other way. */
  public raise(rect: Rect, height: number): void {
    this.decks.push({ rect, height });
  }

  /** Ground that slows, without water to show it, such as thick silk. */
  public slowGround(rect: Rect, factor: number): void {
    this.footings.push({ rect, factor });
  }

  // ─── Buildings and props ────────────────────────────────────────────────

  /**
   * A timber house with a pitched roof. `sunk` lowers it into floodwater;
   * `burnt` blackens it and breaks the roof.
   */
  public house(x: number, z: number, w: number, d: number, rotY: number, options: { sunk?: number; burnt?: boolean; height?: number; flat?: boolean } = {}): THREE.Group {
    const house = new THREE.Group();
    house.position.set(x, -(options.sunk ?? 0), z);
    house.rotation.y = rotY;
    this.group.add(house);

    const burnt = options.burnt;
    const wall = std(burnt ? 0x1c1612 : 0x5a4a38, { roughness: 0.95 });
    const timber = std(burnt ? 0x0e0a08 : 0x2a1a10, { roughness: 0.9 });
    const roof = std(burnt ? 0x14100e : 0x2a2a30, { roughness: 0.7, flatShading: true, side: THREE.DoubleSide });
    const paper = std(0xd8cbb0, { roughness: 1, emissive: burnt ? 0x000000 : 0x3a2810, emissiveIntensity: 0.6 });
    const h = options.height ?? 2.8;

    this.mesh(new THREE.BoxGeometry(w, h, d), wall, 0, h / 2, 0, house);
    // Posts and beams
    for (const px of [-w / 2, w / 2]) for (const pz of [-d / 2, d / 2]) this.mesh(new THREE.BoxGeometry(0.22, h + 0.1, 0.22), timber, px, h / 2, pz, house);
    this.mesh(new THREE.BoxGeometry(w + 0.2, 0.2, d + 0.2), timber, 0, h, 0, house);
    // Paper windows on the long sides
    for (const side of [1, -1]) {
      for (let i = -1; i <= 1; i += 2) {
        const window = this.mesh(new THREE.PlaneGeometry(w * 0.22, h * 0.32), paper, i * w * 0.24, h * 0.55, side * (d / 2 + 0.01), house);
        window.rotation.y = side > 0 ? 0 : Math.PI;
      }
    }
    if (options.flat) {
      this.solid(x, z, w + 0.3, d + 0.3, rotY);
      this.occluders.push(house);
      return house;
    }
    // Pitched roof from two slabs
    const pitch = 0.55;
    const half = d / 2 + 0.6;
    const slab = half / Math.cos(pitch);
    for (const side of [1, -1]) {
      const plate = this.mesh(new THREE.BoxGeometry(w + 1.2, 0.14, slab), roof, 0, h + Math.tan(pitch) * half / 2 + 0.1, side * half / 2, house);
      plate.rotation.x = side * pitch;
      if (burnt) {
        plate.scale.x = 0.6 + this.random.next() * 0.3;
        plate.position.x = (this.random.next() - 0.5) * w * 0.3;
      }
    }
    this.mesh(new THREE.BoxGeometry(w + 1.3, 0.22, 0.22), timber, 0, h + Math.tan(pitch) * half + 0.12, 0, house);

    this.solid(x, z, w + 0.3, d + 0.3, rotY);
    this.occluders.push(house);
    return house;
  }

  /** A stone lantern with a real (pooled) light. */
  public stoneLantern(x: number, z: number, color = 0xffa24a, y = 0): void {
    const stone = std(0x4a4a4e, { roughness: 0.95, flatShading: true });
    const g = new THREE.Group();
    g.position.set(x, y, z);
    this.group.add(g);
    this.mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.25, 6), stone, 0, 0.12, 0, g);
    this.mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.9, 6), stone, 0, 0.7, 0, g);
    this.mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), std(0xffd08a, { emissive: color, emissiveIntensity: 1.4 }), 0, 1.35, 0, g);
    this.mesh(new THREE.ConeGeometry(0.55, 0.4, 6), stone, 0, 1.75, 0, g);
    this.pillar(x, z, 0.4);
    this.light(x, y + 1.4, z, color, 14, 11, 0.12, 1.4);
  }

  /** A paper lantern hanging from a post. */
  public hangingLantern(x: number, z: number, color = 0xff8a3a, y = 0): void {
    const wood = std(0x2a1a10);
    this.box(x, z, 0.14, 2.8, 0.14, wood, { y });
    this.box(x + 0.4, z, 0.9, 0.1, 0.1, wood, { y: y + 2.7 });
    const lantern = this.mesh(new THREE.SphereGeometry(0.28, 10, 8), std(0xe8c890, { emissive: color, emissiveIntensity: 1.6 }), x + 0.75, y + 2.3, z);
    lantern.scale.y = 1.3;
    this.pillar(x, z, 0.2);
    this.light(x + 0.75, y + 2.3, z, color, 12, 10, 0.18, 1.3);
  }

  /** A torii, solid at its pillars. */
  public torii(x: number, z: number, rotY = 0, scale = 1, y = 0): THREE.Group {
    const torii = ToriiGenerator.generate(this.collision);
    torii.position.set(x, y, z);
    torii.rotation.y = rotY;
    torii.scale.setScalar(scale);
    this.group.add(torii);
    for (const side of [1, -1]) {
      const px = x + Math.cos(rotY) * 3.5 * scale * side;
      const pz = z - Math.sin(rotY) * 3.5 * scale * side;
      this.pillar(px, pz, 0.6 * scale);
    }
    this.occluders.push(torii);
    return torii;
  }

  /** A small roadside shrine for resting. */
  public shrine(x: number, z: number, rotY = 0): void {
    const stone = std(0x555a60, { roughness: 0.9, flatShading: true });
    const wood = std(0x4a2a22, { roughness: 0.75 });
    const roofMat = std(0x2a2e38, { roughness: 0.55, flatShading: true });
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    this.group.add(g);
    for (let i = 0; i < 3; i++) this.mesh(new THREE.BoxGeometry(3.4 - i * 0.4, 0.2, 3.4 - i * 0.4), stone, 0, i * 0.2 + 0.1, 0, g);
    this.mesh(new THREE.BoxGeometry(1.8, 1.5, 1.8), wood, 0, 1.35, 0, g);
    const roof = this.mesh(new THREE.ConeGeometry(2.2, 1.2, 4), roofMat, 0, 2.7, 0, g);
    roof.rotation.y = Math.PI / 4;
    this.mesh(new THREE.BoxGeometry(0.9, 0.9, 0.05), std(0xffd890, { emissive: 0xffa040, emissiveIntensity: 1.2 }), 0, 1.4, 0.92, g);
    this.solid(x, z, 2.4, 2.4, rotY);
    this.light(x + Math.sin(rotY) * 1.6, 1.6, z + Math.cos(rotY) * 1.6, 0xffb060, 16, 12, 0.08, 1.8);
    this.occluders.push(g);
  }

  /** The way onward: a torii with a swirling veil that opens once the boss is beaten. */
  public exitGate(x: number, z: number, rotY = 0, color = 0xff6a4a): ExitGate {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    this.group.add(group);
    const torii = this.torii(x, z, rotY, 0.9);
    torii.removeFromParent();
    torii.position.set(0, 0, 0);
    torii.rotation.set(0, 0, 0);
    group.add(torii);

    const veilMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const veil = this.mesh(new THREE.CircleGeometry(2.6, 40), veilMaterial, 0, 3.2, 0, group);
    veil.scale.y = 1.3;
    veil.userData.noShadow = true;
    const ring = this.mesh(new THREE.TorusGeometry(2.7, 0.08, 6, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 }), 0, 3.2, 0, group);
    ring.scale.y = 1.3;
    ring.userData.noShadow = true;
    const glowSprite = createGlowSprite(color, 7, 0);
    glowSprite.position.set(0, 3.2, 0);
    group.add(glowSprite);
    let open = false;
    let amount = 0;
    return {
      group,
      setOpen: isOpen => { open = isOpen; },
      update: time => {
        amount += ((open ? 1 : 0) - amount) * 0.04;
        veilMaterial.opacity = amount * (0.35 + Math.sin(time * 2.4) * 0.08);
        (ring.material as THREE.MeshBasicMaterial).opacity = amount * 0.9;
        (glowSprite.material as THREE.SpriteMaterial).opacity = amount * 0.6;
        veil.rotation.z = time * 0.6;
        ring.rotation.z = -time * 0.4;
      },
    };
  }

  /** A cluster of flickering flames. Purely visual; fire that hurts lives in LevelHazards. */
  public flames(x: number, z: number, size: number, y = 0): void {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    this.group.add(g);
    const outer = new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    const inner = new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const tongues: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const tongue = this.mesh(new THREE.ConeGeometry(0.28 * size, 1.4 * size, 6), i % 2 ? inner : outer, Math.sin(a) * 0.3 * size, 0.6 * size, Math.cos(a) * 0.3 * size, g);
      tongue.userData.noShadow = true;
      tongues.push(tongue);
    }
    const phase = this.random.next() * 10;
    this.onTick(time => {
      tongues.forEach((tongue, i) => {
        const flick = 0.8 + Math.sin(time * 9 + i * 2.1 + phase) * 0.2 + Math.sin(time * 17 + i + phase) * 0.1;
        tongue.scale.set(1, flick, 1);
      });
    });
    this.light(x, y + 1.2 * size, z, 0xff7a2a, 18 * size, 9 + size * 3, 0.3, 2.2 * size);
    this.heat.push(HeatSources.add(new THREE.Vector3(x, y + 0.6 * size, z), 1.6 * size, 1));
  }
}
