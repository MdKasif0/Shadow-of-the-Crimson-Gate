import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CharacterRig } from './CharacterRig';

/**
 * ReferenceModel — Builds a character's body directly from its concept art.
 *
 * Every part is traced in the image's own pixel coordinates, and those same
 * coordinates become its texture mapping. Seen from the front in its rest pose,
 * the model therefore lines up with the art. Round the back, a part mirrors the
 * front, or samples a patch of its own where mirroring would look wrong (a face
 * on the back of a head).
 *
 * Parts on one bone are merged into a single mesh, which keeps draw calls down.
 */

export interface ModelSheet {
  /** Folder and file prefix, such as `/assets/characters/player/ronin`. */
  textures: string;
  imageWidth: number;
  imageHeight: number;
  /** The image column the character's spine sits on. */
  centerX: number;
  /** The image row the character's soles sit on. */
  groundY: number;
  /** Image pixels per world unit. */
  pixelsPerUnit: number;
  /** Cut-out shapes come from a separate `_alpha` texture, rather than the colour's alpha channel. */
  separateAlpha?: boolean;
  /** Lifts the art's dark values so the character reads in dark scenes. */
  brightness?: number;
}

/** One cross-section of a part, in image pixels. */
export interface Ring {
  x: number;
  y: number;
  /** Half the part's width here. */
  hw: number;
  /** Forward offset, in world units. */
  z?: number;
  /** Half the part's depth, in world units. Defaults to `hw` times the part's `depth`. */
  rz?: number;
  /** Where to sample the art, if not at the ring's own position. */
  ux?: number;
  uy?: number;
  uhw?: number;
}

export interface TubeOptions {
  /** Depth as a fraction of width. */
  depth?: number;
  z?: number;
  segments?: number;
  material?: PartMaterial;
  /** Samples this patch round the back, rather than mirroring the front. */
  back?: { x: number; y: number; hw: number; hh: number };
  /** Lays the tube along the bone's forward axis, resting on this height, for feet: rings give `z` and `rz`. */
  forward?: { groundY: number };
}

export interface PanelOptions {
  z?: number;
  /** How far the panel's edges curve back round the body, in world units. */
  bend?: number;
  /** Extra backward lean per world unit downward. */
  lean?: number;
  columns?: number;
  rows?: number;
  material?: PartMaterial;
}

export type PartMaterial = 'body' | 'cloth' | 'hair';

/** Where a character's joints sit in its art, as image pixels. */
export interface ArtJoints {
  /** Height the animator holds the pelvis at. */
  pelvisY: number;
  /** Height of the spine joint above the pelvis. The chest always sits 0.25 above that. */
  spineRise: number;
  neck: [number, number];
  head: [number, number];
  leftShoulder: [number, number];
  leftElbow: [number, number];
  leftHand: [number, number];
  rightShoulder: [number, number];
  rightElbow: [number, number];
  rightHand: [number, number];
  leftHip: [number, number];
  leftKnee: [number, number];
  leftFoot: [number, number];
  rightHip: [number, number];
  rightKnee: [number, number];
  rightFoot: [number, number];
}

/** Moves a rig's joints to where the art has them. Call before building any parts. */
export function poseFromArt(rig: CharacterRig, sheet: ModelSheet, joints: ArtJoints): void {
  const place = (bone: THREE.Object3D, [x, y]: [number, number]) => {
    const parent = bone.parent!;
    parent.updateWorldMatrix(true, false);
    const parentAt = parent.getWorldPosition(new THREE.Vector3());
    bone.position.set(
      (x - sheet.centerX) / sheet.pixelsPerUnit - parentAt.x,
      (sheet.groundY - y) / sheet.pixelsPerUnit - parentAt.y,
      0,
    );
  };

  rig.pelvis.position.set(0, joints.pelvisY, 0);
  rig.spine.position.set(0, joints.spineRise, 0);
  rig.chest.position.set(0, 0.25, 0);
  place(rig.neck, joints.neck);
  place(rig.head, joints.head);
  place(rig.leftUpperArm, joints.leftShoulder);
  place(rig.leftLowerArm, joints.leftElbow);
  place(rig.leftHand, joints.leftHand);
  place(rig.rightUpperArm, joints.rightShoulder);
  place(rig.rightLowerArm, joints.rightElbow);
  place(rig.rightHand, joints.rightHand);
  place(rig.leftUpperLeg, joints.leftHip);
  place(rig.leftLowerLeg, joints.leftKnee);
  place(rig.leftFoot, joints.leftFoot);
  place(rig.rightUpperLeg, joints.rightHip);
  place(rig.rightLowerLeg, joints.rightKnee);
  place(rig.rightFoot, joints.rightFoot);
  rig.weaponSlot.position.set(0, 0, 0);
}
type StrandPoints = [number, number, number][];

const textureLoader = new THREE.TextureLoader();
const materialSets = new Map<string, Record<PartMaterial, THREE.MeshStandardMaterial>>();

function loadTexture(url: string, isColor: boolean): THREE.Texture {
  const texture = textureLoader.load(url);
  if (isColor) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function materialsFor(sheet: ModelSheet): Record<PartMaterial, THREE.MeshStandardMaterial> {
  const existing = materialSets.get(sheet.textures);
  if (existing) return existing;

  const map = loadTexture(`${sheet.textures}_color.webp`, true);
  const normalMap = loadTexture(`${sheet.textures}_normal.webp`, false);
  const orm = loadTexture(`${sheet.textures}_orm.webp`, false);
  const tint = new THREE.Color().setScalar(sheet.brightness ?? 1);

  const set = {
    body: new THREE.MeshStandardMaterial({
      map, normalMap, roughnessMap: orm, metalnessMap: orm, color: tint,
      roughness: 1, metalness: 1, normalScale: new THREE.Vector2(0.9, 0.9),
    }),
    cloth: new THREE.MeshStandardMaterial({
      map, normalMap, color: tint, roughness: 0.92, metalness: 0,
      side: THREE.DoubleSide, alphaTest: 0.5,
      alphaMap: sheet.separateAlpha ? loadTexture(`${sheet.textures}_alpha.webp`, false) : null,
    }),
    hair: new THREE.MeshStandardMaterial({
      color: 0x0a0a0c, roughness: 0.46, metalness: 0.1, side: THREE.DoubleSide,
    }),
  };
  materialSets.set(sheet.textures, set);
  return set;
}

/** A hanging sheet of cloth, moved each frame by wind and the character's speed. */
export class ClothSheet {
  private rest: Float32Array;
  private time = Math.random() * 10;
  private speed = 0;
  private frame = 0;

  constructor(
    private geometry: THREE.BufferGeometry,
    private columns: number,
    private rows: number,
    private swing: number,
  ) {
    this.rest = (geometry.attributes.position.array as Float32Array).slice();
  }

  public update(dt: number, speed: number): void {
    this.time += dt;
    this.speed += (speed - this.speed) * Math.min(dt * 5, 1);

    const position = this.geometry.attributes.position as THREE.BufferAttribute;
    const lift = Math.min(this.speed * this.swing, 0.75);

    for (let row = 0; row <= this.rows; row++) {
      const t = row / this.rows;
      const weight = t * t;
      for (let column = 0; column <= this.columns; column++) {
        const index = row * (this.columns + 1) + column;
        const across = column / this.columns;
        const ripple = Math.sin(this.time * 2.3 + t * 5 + across * 4) * 0.022
          + Math.sin(this.time * 3.7 + t * 9 - across * 6) * 0.012 * (1 + this.speed * 0.25);
        position.setXYZ(
          index,
          this.rest[index * 3] + Math.sin(this.time * 1.4 + t * 3) * 0.012 * t,
          this.rest[index * 3 + 1] + lift * weight * 0.42,
          this.rest[index * 3 + 2] - lift * weight + ripple * t,
        );
      }
    }
    position.needsUpdate = true;

    // Lighting barely changes from one frame to the next
    if (++this.frame % 3 === 0) this.geometry.computeVertexNormals();
  }
}

/** Adds a narrower ring beyond each end of a part, so its ends dome over instead of stopping flat. */
function roundEnds(rings: Ring[], depth: number, pixelsPerUnit: number): Ring[] {
  const beyond = (end: Ring, inner: Ring): Ring => {
    const dx = end.x - inner.x;
    const dy = end.y - inner.y;
    const length = Math.hypot(dx, dy) || 1;
    const reach = end.hw * 0.42;
    return {
      ...end,
      x: end.x + (dx / length) * reach,
      y: end.y + (dy / length) * reach,
      hw: end.hw * 0.55,
      rz: end.rz !== undefined ? end.rz * 0.55 : (end.hw * depth * 0.55) / pixelsPerUnit,
      ux: end.ux,
      uy: end.uy,
      uhw: end.uhw !== undefined ? end.uhw * 0.55 : undefined,
    };
  };
  // Thin parts, like horn tips and blades, already come to a point
  const first = rings[0].hw >= 14 ? [beyond(rings[0], rings[1])] : [];
  const lastIndex = rings.length - 1;
  const last = rings[lastIndex].hw >= 14 ? [beyond(rings[lastIndex], rings[lastIndex - 1])] : [];
  return [...first, ...rings, ...last];
}

export class ReferenceModel {
  private parts = new Map<THREE.Object3D, Map<PartMaterial, THREE.BufferGeometry[]>>();
  private materials: Record<PartMaterial, THREE.MeshStandardMaterial>;

  public get bodyMaterial(): THREE.MeshStandardMaterial {
    return this.materials.body;
  }

  constructor(private rootBone: THREE.Object3D, private sheet: ModelSheet) {
    this.materials = materialsFor(sheet);
    rootBone.updateMatrixWorld(true);
  }

  private toWorldX(x: number): number {
    return (x - this.sheet.centerX) / this.sheet.pixelsPerUnit;
  }

  private toWorldY(y: number): number {
    return (this.sheet.groundY - y) / this.sheet.pixelsPerUnit;
  }

  private addPart(bone: THREE.Object3D, material: PartMaterial, geometry: THREE.BufferGeometry): void {
    let byMaterial = this.parts.get(bone);
    if (!byMaterial) this.parts.set(bone, byMaterial = new Map());
    let list = byMaterial.get(material);
    if (!list) byMaterial.set(material, list = []);
    list.push(geometry);
  }

  private boneOrigin(bone: THREE.Object3D): THREE.Vector3 {
    bone.updateWorldMatrix(true, false);
    return bone.getWorldPosition(new THREE.Vector3());
  }

  private uv(x: number, y: number): [number, number] {
    return [x / this.sheet.imageWidth, 1 - y / this.sheet.imageHeight];
  }

  /** A closed, roughly elliptical part through a list of cross-sections. */
  public tube(bone: THREE.Object3D, rings: Ring[], options: TubeOptions = {}): void {
    const { depth = 0.9, z: baseZ = 0, segments = 18, material = 'body', back, forward } = options;
    if (!forward) rings = roundEnds(rings, depth, this.sheet.pixelsPerUnit);
    const origin = this.boneOrigin(bone);
    const ppu = this.sheet.pixelsPerUnit;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    interface Frame { center: THREE.Vector3; n: THREE.Vector3; d: THREE.Vector3; imageN: [number, number]; rx: number; rz: number; ring: Ring; t: number }
    const frames: Frame[] = rings.map((ring, i) => {
      const previous = rings[Math.max(i - 1, 0)];
      const next = rings[Math.min(i + 1, rings.length - 1)];
      const t = i / (rings.length - 1);
      const rx = ring.hw / ppu;
      const ux = next.ux !== undefined ? next.ux - (previous.ux ?? 0) : 0;
      const uy = next.uy !== undefined ? next.uy - (previous.uy ?? 0) : 0;

      if (forward) {
        return {
          center: new THREE.Vector3(0, forward.groundY + (ring.rz ?? 0.04), ring.z ?? 0),
          n: new THREE.Vector3(1, 0, 0), d: new THREE.Vector3(0, 1, 0),
          imageN: [1, 0] as [number, number], rx, rz: ring.rz ?? 0.04, ring, t,
        };
      }

      const dx = next.x - previous.x;
      const dy = next.y - previous.y;
      const length = Math.hypot(dx, dy) || 1;
      // The right-hand side of the image, perpendicular to the part's direction
      let imageN: [number, number] = [dy / length, -dx / length];
      const usesOwnSample = ring.ux !== undefined;
      if (usesOwnSample) {
        const uLength = Math.hypot(ux, uy) || 1;
        imageN = [uy / uLength, -ux / uLength];
      }
      const worldN = new THREE.Vector3(dy / length, dx / length, 0);
      if (dy < 0) worldN.negate();
      if (dy < 0 && !usesOwnSample) imageN = [-imageN[0], -imageN[1]];

      return {
        center: new THREE.Vector3(
          this.toWorldX(ring.x) - origin.x,
          this.toWorldY(ring.y) - origin.y,
          baseZ + (ring.z ?? 0) - origin.z,
        ),
        n: worldN, d: new THREE.Vector3(0, 0, 1), imageN, rx,
        rz: ring.rz ?? rx * depth, ring, t,
      };
    });

    const addStrip = (from: number, to: number, count: number, sample: (f: Frame, angle: number) => [number, number]) => {
      const start = positions.length / 3;
      for (const f of frames) {
        for (let j = 0; j <= count; j++) {
          const angle = from + (to - from) * (j / count);
          const s = Math.sin(angle);
          const c = Math.cos(angle);
          const p = f.center.clone().addScaledVector(f.n, f.rx * s).addScaledVector(f.d, f.rz * c);
          positions.push(p.x, p.y, p.z);
          const normal = f.n.clone().multiplyScalar(s / Math.max(f.rx, 1e-4))
            .addScaledVector(f.d, c / Math.max(f.rz, 1e-4)).normalize();
          normals.push(normal.x, normal.y, normal.z);
          uvs.push(...sample(f, angle));
        }
      }
      for (let i = 0; i < frames.length - 1; i++) {
        for (let j = 0; j < count; j++) {
          const a = start + i * (count + 1) + j;
          const b = a + 1;
          const c = a + count + 1;
          const d = c + 1;
          indices.push(a, c, b, b, c, d);
        }
      }
    };

    /** Unwraps angle linearly, folding at the sides so the back mirrors the front. */
    const frontSample = (f: Frame, angle: number): [number, number] => {
      const wrapped = Math.atan2(Math.sin(angle), Math.cos(angle));
      const folded = Math.abs(wrapped) <= Math.PI / 2
        ? wrapped
        : Math.sign(wrapped) * (Math.PI - Math.abs(wrapped));
      // A little inside the traced edge, so the part's sides never sample past the figure
      const offset = (folded / (Math.PI / 2)) * (f.ring.uhw ?? f.ring.hw * 0.88);
      return this.uv(
        (f.ring.ux ?? f.ring.x) + f.imageN[0] * offset,
        (f.ring.uy ?? f.ring.y) + f.imageN[1] * offset,
      );
    };

    if (back) {
      const seam = Math.PI * 0.68;
      addStrip(-seam, seam, Math.round(segments * 0.68), frontSample);
      addStrip(seam, Math.PI * 2 - seam, Math.round(segments * 0.32), (f, angle) => {
        const across = (angle - Math.PI) / (Math.PI - seam);
        return this.uv(back.x + across * back.hw, back.y + (f.t - 0.5) * 2 * back.hh);
      });
    } else {
      addStrip(-Math.PI, Math.PI, segments, frontSample);
    }

    // Rounded-off ends
    const cap = (frame: Frame, isStart: boolean) => {
      const center = positions.length / 3;
      const axis = new THREE.Vector3().crossVectors(frame.n, frame.d).multiplyScalar(isStart ? -1 : 1);
      positions.push(frame.center.x, frame.center.y, frame.center.z);
      normals.push(axis.x, axis.y, axis.z);
      uvs.push(...frontSample(frame, 0));
      const rim = positions.length / 3;
      for (let j = 0; j <= segments; j++) {
        const angle = -Math.PI + (Math.PI * 2 * j) / segments;
        const p = frame.center.clone()
          .addScaledVector(frame.n, frame.rx * Math.sin(angle))
          .addScaledVector(frame.d, frame.rz * Math.cos(angle));
        positions.push(p.x, p.y, p.z);
        normals.push(axis.x, axis.y, axis.z);
        uvs.push(...frontSample(frame, 0));
      }
      for (let j = 0; j < segments; j++) {
        if (isStart) indices.push(center, rim + j, rim + j + 1);
        else indices.push(center, rim + j + 1, rim + j);
      }
    };
    cap(frames[0], true);
    cap(frames[frames.length - 1], false);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    this.addPart(bone, material, geometry);
  }

  /** A curved sheet cut from the art: armour plates, hanging cloth. Corners run clockwise from top left. */
  public panel(bone: THREE.Object3D, corners: [number, number][], options: PanelOptions = {}): void {
    const { z = 0, bend = 0, lean = 0, columns = 6, rows = 8, material = 'body' } = options;
    const origin = this.boneOrigin(bone);
    const [tl, tr, br, bl] = corners;
    const topY = this.toWorldY((tl[1] + tr[1]) / 2);

    const geometry = new THREE.PlaneGeometry(1, 1, columns, rows);
    const position = geometry.attributes.position as THREE.BufferAttribute;
    const uv = geometry.attributes.uv as THREE.BufferAttribute;

    for (let i = 0; i < position.count; i++) {
      const s = uv.getX(i);
      const t = 1 - uv.getY(i);
      const x = (tl[0] + (tr[0] - tl[0]) * s) * (1 - t) + (bl[0] + (br[0] - bl[0]) * s) * t;
      const y = (tl[1] + (tr[1] - tl[1]) * s) * (1 - t) + (bl[1] + (br[1] - bl[1]) * s) * t;
      const worldY = this.toWorldY(y);
      const across = s * 2 - 1;
      position.setXYZ(
        i,
        this.toWorldX(x) - origin.x,
        worldY - origin.y,
        z - origin.z - bend * across * across - lean * (topY - worldY),
      );
      const [u, v] = this.uv(x, y);
      uv.setXY(i, u, v);
    }
    geometry.computeVertexNormals();

    this.addPart(bone, material, geometry);
  }

  /** A foot resting on the ground, unwrapped from a foot in the art that faces the viewer. */
  public foot(bone: THREE.Object3D, art: { x: number; top: number; bottom: number; hw: number; height?: number }): void {
    const height = art.height ?? 0.075;
    const at = (t: number) => art.top + (art.bottom - art.top) * t;
    this.tube(bone, [
      { x: art.x, y: at(0), hw: art.hw * 0.68, z: -0.09, rz: height * 0.65 },
      { x: art.x, y: at(0.15), hw: art.hw * 0.8, z: -0.02, rz: height },
      { x: art.x, y: at(0.42), hw: art.hw * 0.96, z: 0.07, rz: height * 0.74 },
      { x: art.x, y: at(0.78), hw: art.hw, z: 0.16, rz: height * 0.52 },
      { x: art.x, y: at(1), hw: art.hw * 0.76, z: 0.22, rz: height * 0.28 },
    ], { forward: { groundY: -this.boneOrigin(bone).y } });
  }

  /** Small glowing points at the art's eyes, so they catch the bloom. */
  public eyes(bone: THREE.Object3D, points: [number, number][], z: number, radius: number, material: THREE.Material): void {
    const origin = this.boneOrigin(bone);
    const geometry = new THREE.SphereGeometry(radius, 8, 6);
    for (const [x, y] of points) {
      const eye = new THREE.Mesh(geometry, material);
      eye.position.set(this.toWorldX(x) - origin.x, this.toWorldY(y) - origin.y, z);
      eye.scale.y = 0.7;
      bone.add(eye);
    }
  }

  /** A tapering, flat lock of hair through local-space points. */
  public strand(bone: THREE.Object3D, points: StrandPoints, width: number, segments = 8): void {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const positions: number[] = [];
    const indices: number[] = [];
    const tangent = new THREE.Vector3();
    const side = new THREE.Vector3();
    const point = new THREE.Vector3();
    const forward = new THREE.Vector3(0.3, 0.2, 1).normalize();

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      curve.getPoint(t, point);
      curve.getTangent(t, tangent);
      side.crossVectors(tangent, forward).normalize();
      const w = width * (1 - t * t) * (t < 0.1 ? 0.5 + t * 5 : 1);
      positions.push(point.x + side.x * w, point.y + side.y * w, point.z + side.z * w);
      positions.push(point.x - side.x * w, point.y - side.y * w, point.z - side.z * w);
      if (i < segments) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((positions.length / 3) * 2).fill(0), 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    this.addPart(bone, 'hair', geometry);
  }

  /**
   * A sheet that moves. `shape` gives its rest position in the bone's space, and
   * `sample` the image pixel to show, each from `u` (-1 to 1 across) and `t` (0 to 1 down).
   */
  public cloth(
    bone: THREE.Object3D,
    columns: number,
    rows: number,
    swing: number,
    shape: (u: number, t: number) => [number, number, number],
    sample: (u: number, t: number) => [number, number],
  ): ClothSheet {
    const geometry = new THREE.PlaneGeometry(1, 1, columns, rows);
    const position = geometry.attributes.position as THREE.BufferAttribute;
    const uv = geometry.attributes.uv as THREE.BufferAttribute;

    for (let row = 0; row <= rows; row++) {
      for (let column = 0; column <= columns; column++) {
        const index = row * (columns + 1) + column;
        const u = (column / columns) * 2 - 1;
        const t = row / rows;
        const [x, y, z] = shape(u, t);
        position.setXYZ(index, x, y, z);
        const [px, py] = sample(u, t);
        const [tu, tv] = this.uv(px, py);
        uv.setXY(index, tu, tv);
      }
    }
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, this.materials.cloth);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    bone.add(mesh);
    return new ClothSheet(geometry, columns, rows, swing);
  }

  /** Merges everything added so far into meshes on their bones. */
  public finish(): void {
    for (const [bone, byMaterial] of this.parts) {
      for (const [material, geometries] of byMaterial) {
        const merged = mergeGeometries(geometries, false);
        if (!merged) continue;
        const mesh = new THREE.Mesh(merged, this.materials[material]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        bone.add(mesh);
        geometries.forEach(g => g.dispose());
      }
    }
    this.parts.clear();
  }
}
