import * as THREE from 'three';
import { CollisionSystem } from '../collision/CollisionSystem';
import { createGlowSprite } from '../lighting/WorldLights';
import { DialogueNode } from '../dialogue/DialogueNode';

/**
 * WorldSecrets — Things off the main path: charms, lore scrolls, caches of
 * essence, and an alcove sealed by a spirit ward.
 */

export type SecretKind = 'charm' | 'scroll' | 'cache';

export interface SecretDef {
  id: string;
  kind: SecretKind;
  x: number;
  z: number;
  /** Height of the ground it rests on, for secrets up on a deck or roof. */
  y?: number;
  charmId?: string;
  essence?: number;
  scroll?: DialogueNode[];
}

const scroll = (id: string, title: string, pages: string[]): DialogueNode[] =>
  pages.map((text, i) => ({ id: `${id}_${i}`, speaker: title, text, next: i < pages.length - 1 ? `${id}_${i + 1}` : undefined }));

export const SECRETS: SecretDef[] = [
  { id: 'charm_crane', kind: 'charm', charmId: 'crane_feather', x: -19, z: 47 },
  {
    id: 'scroll_gate', kind: 'scroll', x: 17, z: 45,
    scroll: scroll('scroll_gate', "Gatekeeper's Ledger", [
      'Third night of the frost moon. No pilgrims climbed today. The bells at the temple rang on their own, though no one stood beneath them.',
      'The keeper says the old seal is only tired. I have seen his hands shake when he says it. I have barred the lower gate, and I will not open it again.',
    ]),
  },
  { id: 'charm_fox', kind: 'charm', charmId: 'fox_mask', x: 18.5, z: 39.5 },
  { id: 'cache_courtyard', kind: 'cache', essence: 40, x: 20, z: 33 },
  { id: 'charm_ember', kind: 'charm', charmId: 'ember_bead', x: 19, z: -32 },
  {
    id: 'scroll_forest', kind: 'scroll', x: -17, z: -27,
    scroll: scroll('scroll_forest', 'A Prayer Slip, Tied to a Branch', [
      'For my brother, who went up to the temple to see the red gate open. Please let him come home before the snow.',
      'If the shadows took him, let them give him back. I will leave rice for them every night. I will not be afraid.',
    ]),
  },
  {
    id: 'scroll_temple', kind: 'scroll', x: 16, z: -52,
    scroll: scroll('scroll_temple', "The Abbot's Last Entry", [
      'We did not wake the Oni. We bargained with it. A heart of crimson fire, sealed beneath the gate, and in return the mountain would never know famine.',
      'The pact has failed. Whoever reaches the heart must choose: break it and free the mountain, or take its fire and carry the bargain alone. I could do neither.',
    ]),
  },
  { id: 'cache_temple', kind: 'cache', essence: 60, x: 16, z: -78 },
  { id: 'charm_moon', kind: 'charm', charmId: 'moon_tear', x: -21.6, z: 1.5 },
];

/** The spirit ward across the mouth of the courtyard alcove. */
export const WARD = { id: 'ward_courtyard', x: -18.2, z: 1.5 };
/** The alcove's walls: centre, and extent along x and z. */
const ALCOVE = { x: -21, z: 1.5, width: 5.6, depth: 5.6 };

export interface SecretVisual {
  def: SecretDef;
  item: THREE.Object3D;
}

export class WorldSecrets {
  public readonly group = new THREE.Group();
  public readonly visuals = new Map<string, SecretVisual>();
  private wardMesh: THREE.Group | null = null;
  private wardBox: THREE.Box3 | null = null;
  private time = 0;

  /** The courtyard's secrets come with the warded alcove; other levels pass their own. */
  constructor(private collisionSystem: CollisionSystem, defs: SecretDef[] = SECRETS, withAlcove: boolean = true) {
    this.group.name = 'Secrets';
    for (const def of defs) this.visuals.set(def.id, this.buildSecret(def));
    if (withAlcove) this.buildAlcove();
  }

  private buildSecret(def: SecretDef): SecretVisual {
    const stone = new THREE.MeshStandardMaterial({ color: 0x4a4a50, roughness: 0.95, flatShading: true });
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.7, 7), stone);
    const baseY = def.y ?? 0;
    pedestal.position.set(def.x, baseY + 0.35, def.z);
    pedestal.castShadow = pedestal.receiveShadow = true;
    this.group.add(pedestal);

    const item = new THREE.Group();
    item.position.set(def.x, baseY + 1.15, def.z);
    item.userData.baseY = baseY + 1.15;
    const color = def.kind === 'charm' ? 0xffcf6a : def.kind === 'scroll' ? 0xffe9c0 : 0x7fe8ff;

    if (def.kind === 'charm') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 8, 18),
        new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.9, roughness: 0.3, emissive: 0x6a4a10, emissiveIntensity: 0.6 }));
      item.add(ring);
    } else if (def.kind === 'scroll') {
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 10),
        new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9, emissive: 0x403020, emissiveIntensity: 0.4 }));
      roll.rotation.z = Math.PI / 2;
      const ties = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 5, 10), new THREE.MeshStandardMaterial({ color: 0x8f171b }));
      ties.rotation.y = Math.PI / 2;
      item.add(roll, ties);
    } else {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0),
        new THREE.MeshStandardMaterial({ color: 0xa8f4ff, emissive: 0x3fbfe0, emissiveIntensity: 1.6 }));
      item.add(crystal);
    }
    const glow = createGlowSprite(color, 1.5, 0.55);
    item.add(glow);
    this.group.add(item);
    return { def, item };
  }

  /** A small palisaded nook off the courtyard, closed by a paper ward. */
  private buildAlcove(): void {
    const wood = new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.9 });
    const { x, z, width, depth } = ALCOVE;
    const walls = [
      { cx: x, cz: z + depth / 2, sx: width, sz: 0.4 },
      { cx: x, cz: z - depth / 2, sx: width, sz: 0.4 },
      { cx: x - width / 2, cz: z, sx: 0.4, sz: depth + 0.4 },
    ];
    for (const w of walls) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w.sx, 2.6, w.sz), wood);
      wall.position.set(w.cx, 1.3, w.cz);
      wall.castShadow = wall.receiveShadow = true;
      this.group.add(wall);
      this.collisionSystem.addBox(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(w.cx, 1.3, w.cz), new THREE.Vector3(w.sx, 2.6, w.sz)));
    }

    // The ward: a glowing veil hung with paper charms and a sacred rope
    this.wardMesh = new THREE.Group();
    this.wardMesh.position.set(WARD.x, 0, WARD.z);
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(ALCOVE.depth, 2.8),
      new THREE.MeshBasicMaterial({ color: 0xff5a3a, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    veil.rotation.y = Math.PI / 2;
    veil.position.y = 1.4;
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, ALCOVE.depth, 8), new THREE.MeshStandardMaterial({ color: 0xc9b98a, roughness: 0.9 }));
    rope.rotation.x = Math.PI / 2;
    rope.position.y = 2.7;
    this.wardMesh.add(veil, rope);
    const paper = new THREE.MeshStandardMaterial({ color: 0xece2c8, roughness: 0.9, side: THREE.DoubleSide, emissive: 0x402a10, emissiveIntensity: 0.4 });
    for (let i = 0; i < 5; i++) {
      const slip = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.7), paper);
      slip.rotation.y = Math.PI / 2;
      slip.position.set(0, 2.25, -2.2 + i * 1.1);
      this.wardMesh.add(slip);
    }
    this.group.add(this.wardMesh);
    this.wardBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(WARD.x, 1.4, WARD.z), new THREE.Vector3(0.6, 2.8, ALCOVE.depth));
    this.collisionSystem.addBox(this.wardBox);
  }

  public markCollected(id: string): void {
    const visual = this.visuals.get(id);
    if (visual) visual.item.visible = false;
  }

  public breakWard(): void {
    if (!this.wardMesh || !this.wardBox) return;
    this.wardMesh.visible = false;
    const index = this.collisionSystem.boxes.indexOf(this.wardBox);
    if (index >= 0) this.collisionSystem.boxes.splice(index, 1);
  }

  public restoreWard(): void {
    if (!this.wardMesh || !this.wardBox) return;
    this.wardMesh.visible = true;
    if (!this.collisionSystem.boxes.includes(this.wardBox)) this.collisionSystem.addBox(this.wardBox);
  }

  public resetAll(): void {
    for (const visual of this.visuals.values()) visual.item.visible = true;
    this.restoreWard();
  }

  public update(dt: number): void {
    this.time += dt;
    for (const { item } of this.visuals.values()) {
      if (!item.visible) continue;
      item.rotation.y += dt * 1.2;
      item.position.y = item.userData.baseY + Math.sin(this.time * 2 + item.position.x) * 0.08;
    }
    if (this.wardMesh?.visible) {
      const veil = this.wardMesh.children[0] as THREE.Mesh;
      (veil.material as THREE.MeshBasicMaterial).opacity = 0.18 + Math.sin(this.time * 2.4) * 0.07;
    }
  }
}
