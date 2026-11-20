import * as THREE from 'three';
import { HazardKind } from '../enemies/LevelEnemyTypes';
import { HeatSource, HeatSources } from '../rendering/HeatSources';

/**
 * LevelHazards — Ground that lingers: fire that burns while you stand in it,
 * webs and floodwater that slow you. Each warns before it takes hold.
 * (One-off bursts use the arena hazard system instead.)
 */

const WARN_SECONDS: Record<string, number> = { fire: 0.9, water: 0.8, web: 0.25 };
const LIFE_SECONDS: Record<string, number> = { fire: 6, water: 7, web: 9 };
const FOOTING: Record<string, number> = { fire: 1, water: 0.55, web: 0.4 };
const COLORS: Record<string, { warn: number; body: number }> = {
  fire: { warn: 0xff6a20, body: 0xff4a10 },
  water: { warn: 0x6ac8ff, body: 0x2a6a9a },
  web: { warn: 0xe8e8f0, body: 0xd8d8e8 },
};

interface Zone {
  kind: HazardKind;
  position: THREE.Vector3;
  radius: number;
  /** Fire: damage per second. Water: damage once, as it lands. */
  damage: number;
  age: number;
  life: number;
  isLive: boolean;
  root: THREE.Group;
  warn: THREE.Mesh;
  body: THREE.Mesh;
  flames: THREE.Mesh[];
  heat: HeatSource | null;
}

export class LevelHazards {
  public readonly group = new THREE.Group();
  private zones: Zone[] = [];
  private burn = 0;

  constructor() {
    this.group.name = 'LevelHazards';
  }

  /** `life` overrides how long it lasts; fire from the level itself can burn for good. */
  public spawn(kind: HazardKind, position: THREE.Vector3, radius: number, damage: number, life?: number): void {
    if (kind === 'burst') return;
    const colors = COLORS[kind];
    const root = new THREE.Group();
    root.position.copy(position).setY(position.y + 0.08);

    const warn = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.18, radius, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: colors.warn, transparent: true, opacity: 0.7, depthWrite: false }),
    );
    const bodyMaterial = new THREE.MeshBasicMaterial({
      color: colors.body, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
      blending: kind === 'fire' ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const body = new THREE.Mesh(kind === 'web' ? webGeometry(radius) : new THREE.CircleGeometry(radius, 36).rotateX(-Math.PI / 2), bodyMaterial);
    body.position.y = 0.02;
    root.add(warn, body);

    const flames: THREE.Mesh[] = [];
    if (kind === 'fire') {
      const material = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const count = Math.round(radius * 4);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius * 0.85;
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1, 5), material);
        flame.position.set(Math.sin(a) * r, 0.5, Math.cos(a) * r);
        flame.userData.phase = Math.random() * 10;
        root.add(flame);
        flames.push(flame);
      }
    }

    this.group.add(root);
    this.zones.push({
      kind, position: position.clone(), radius, damage, age: 0,
      life: life ?? LIFE_SECONDS[kind], isLive: false, root, warn, body, flames,
      heat: kind === 'fire' ? HeatSources.add(position, radius, 0.8) : null,
    });
  }

  /** The slowest footing from any live web or flood at this point. */
  public footingAt(x: number, z: number): number {
    let factor = 1;
    for (const zone of this.zones) {
      if (!zone.isLive || FOOTING[zone.kind] >= factor) continue;
      if (Math.hypot(x - zone.position.x, z - zone.position.z) < zone.radius) factor = FOOTING[zone.kind];
    }
    return factor;
  }

  /** True if a live fire covers this point. */
  public isBurning(x: number, z: number): boolean {
    return this.zones.some(zone => zone.isLive && zone.kind === 'fire' && Math.hypot(x - zone.position.x, z - zone.position.z) < zone.radius);
  }

  /** Ages every zone. Returns this frame's damage to the player, in whole points: burns and splashes. */
  public update(dt: number, time: number, player: THREE.Vector3): { burn: number; splash: number } {
    let splash = 0;
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const zone = this.zones[i];
      zone.age += dt;
      const warnFor = WARN_SECONDS[zone.kind];
      const inside = Math.hypot(player.x - zone.position.x, player.z - zone.position.z) < zone.radius;

      if (!zone.isLive) {
        const p = zone.age / warnFor;
        (zone.warn.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.abs(Math.sin(p * 12)) * 0.5;
        (zone.body.material as THREE.MeshBasicMaterial).opacity = p * 0.2;
        if (zone.age >= warnFor) {
          zone.isLive = true;
          zone.warn.visible = false;
          if (zone.kind === 'water' && inside) splash += zone.damage;
        }
        continue;
      }

      const remaining = zone.life - (zone.age - warnFor);
      const fade = THREE.MathUtils.clamp(remaining / 1.2, 0, 1);
      const baseOpacity = zone.kind === 'fire' ? 0.55 : zone.kind === 'water' ? 0.5 : 0.55;
      (zone.body.material as THREE.MeshBasicMaterial).opacity = baseOpacity * fade;
      for (const flame of zone.flames) {
        const flick = 0.7 + Math.sin(time * 10 + flame.userData.phase) * 0.3;
        flame.scale.set(1, flick * 1.4, 1);
        (flame.material as THREE.MeshBasicMaterial).opacity = 0.75 * fade;
      }
      if (zone.kind === 'fire' && inside) this.burn += zone.damage * dt;

      if (remaining <= 0) {
        this.removeAt(i);
      }
    }
    const burn = Math.floor(this.burn);
    this.burn -= burn;
    return { burn, splash };
  }

  public clear(): void {
    for (let i = this.zones.length - 1; i >= 0; i--) this.removeAt(i);
    this.burn = 0;
  }

  private removeAt(index: number): void {
    const zone = this.zones[index];
    if (zone.heat) HeatSources.remove(zone.heat);
    zone.root.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    zone.root.removeFromParent();
    this.zones.splice(index, 1);
  }
}

/** Radial threads and rings, for a web lying on the ground. */
function webGeometry(radius: number): THREE.BufferGeometry {
  const points: number[] = [];
  const spokes = 10;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    points.push(0, 0, 0, Math.sin(a) * radius, 0, Math.cos(a) * radius);
  }
  for (let ring = 1; ring <= 4; ring++) {
    const r = (ring / 4) * radius;
    for (let i = 0; i < spokes; i++) {
      const a0 = (i / spokes) * Math.PI * 2;
      const a1 = ((i + 1) / spokes) * Math.PI * 2;
      points.push(Math.sin(a0) * r, 0, Math.cos(a0) * r, Math.sin(a1) * r * 0.92, 0, Math.cos(a1) * r * 0.92);
    }
  }
  // Thin quads along each thread, so the web reads from above
  const geometry = new THREE.BufferGeometry();
  const quads: number[] = [];
  for (let i = 0; i < points.length; i += 6) {
    const [x0, , z0, x1, , z1] = points.slice(i, i + 6);
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * 0.04;
    const nz = (dx / len) * 0.04;
    quads.push(
      x0 - nx, 0, z0 - nz, x1 - nx, 0, z1 - nz, x1 + nx, 0, z1 + nz,
      x0 - nx, 0, z0 - nz, x1 + nx, 0, z1 + nz, x0 + nx, 0, z0 + nz,
    );
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(quads, 3));
  geometry.computeVertexNormals();
  return geometry;
}
