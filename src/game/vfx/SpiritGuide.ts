import * as THREE from 'three';
import { SoftParticles } from './SoftParticles';
import { getGlowTexture } from '../utils/ProceduralTextures';
import { pathLength, pointAlong } from '../levels/Wayfinding';

const LEAD = 5.5;
const TRAIL_LENGTH = 30;
const GOLD = new THREE.Color(1.6, 1.15, 0.6);
const GOLD_DIM = new THREE.Color(1.0, 0.72, 0.38);

/**
 * SpiritGuide — A small warm hitodama that floats a few steps ahead along the
 * way you should go, and a trail of gold motes rising off the ground behind
 * it. It waits for you if you stop, and keeps its distance while you fight.
 */
export class SpiritGuide {
  private motes = new SoftParticles(520, { softness: 2.4 });
  private flame = new SoftParticles(260, { softness: 1.3 });
  private core: THREE.Sprite;
  private halo: THREE.Sprite;
  private group = new THREE.Group();
  private position = new THREE.Vector3();
  private presence = 0;
  private hasPosition = false;
  private emitMotes = 0;
  private emitFlame = 0;
  private pulse = 0;

  constructor(scene: THREE.Scene) {
    const texture = getGlowTexture();
    this.core = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, color: new THREE.Color(2.2, 1.7, 1.0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.core.scale.setScalar(0.55);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, color: new THREE.Color(0.9, 0.55, 0.22), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35,
    }));
    this.halo.scale.setScalar(2.4);
    this.group.add(this.core, this.halo);
    this.group.visible = false;
    for (const object of [this.group, this.motes.points, this.flame.points]) {
      object.userData.noAO = true;
      scene.add(object);
    }
  }

  /**
   * `path` runs from the Ronin to where they should go, or is null where there
   * is nowhere to lead. While `isCombat`, the guide dims and holds back.
   */
  public update(dt: number, time: number, path: THREE.Vector3[] | null, groundHeight: (x: number, z: number) => number, isCombat: boolean): void {
    const length = path ? pathLength(path) : 0;
    const wanted = path && length > 2.5 ? (isCombat ? 0.12 : 1) : 0;
    this.presence += (wanted - this.presence) * Math.min(1, dt * (wanted > this.presence ? 1.2 : 3));

    if (path && length > 0.5) {
      const target = pointAlong(path, Math.min(LEAD, length));
      target.y = groundHeight(target.x, target.z) + 1.65 + Math.sin(time * 1.7) * 0.18;
      if (!this.hasPosition) {
        this.position.copy(target);
        this.hasPosition = true;
      }
      this.position.lerp(target, 1 - Math.exp(-dt * 2.4));
    }

    const p = this.presence;
    this.group.visible = p > 0.01;
    this.group.position.copy(this.position);
    const flicker = 0.85 + Math.sin(time * 13) * 0.08 + Math.sin(time * 29) * 0.06;
    this.core.material.opacity = p * flicker;
    this.halo.material.opacity = p * 0.32 * flicker;
    this.core.scale.setScalar(0.5 + Math.sin(time * 4) * 0.04);

    const density = SoftParticles.density();
    if (p > 0.05 && path) {
      // A little flame licking up off the wisp, trailing as it moves
      this.emitFlame += dt * 70 * p * density;
      while (this.emitFlame >= 1) {
        this.emitFlame--;
        this.flame.emit({
          position: this.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.18)),
          velocity: new THREE.Vector3((Math.random() - 0.5) * 0.25, 0.7 + Math.random() * 0.5, (Math.random() - 0.5) * 0.25),
          life: 0.35 + Math.random() * 0.35, size: 0.22, sizeEnd: 0.04, color: GOLD, alpha: 0.9 * p, drag: 1.5,
        });
      }

      // Motes rising off the way ahead, with a brighter pulse running along it
      const trail = Math.min(length, TRAIL_LENGTH);
      this.pulse = (this.pulse + dt * 9) % (trail + 8);
      this.emitMotes += dt * (55 + trail * 1.5) * p * density;
      while (this.emitMotes >= 1) {
        this.emitMotes--;
        const isPulse = Math.random() < 0.35;
        const d = isPulse ? this.pulse + (Math.random() - 0.5) * 2 : 1.2 + Math.pow(Math.random(), 1.25) * (trail - 1.2);
        if (d < 0.8 || d > trail) continue;
        const at = pointAlong(path, d);
        at.x += (Math.random() - 0.5) * 0.7;
        at.z += (Math.random() - 0.5) * 0.7;
        at.y = groundHeight(at.x, at.z) + 0.06 + Math.random() * 0.2;
        const far = d / trail;
        this.motes.emit({
          position: at,
          velocity: new THREE.Vector3((Math.random() - 0.5) * 0.12, 0.2 + Math.random() * 0.35, (Math.random() - 0.5) * 0.12),
          life: 0.9 + Math.random() * 0.9, size: isPulse ? 0.16 : 0.1, sizeEnd: 0.03,
          color: isPulse ? GOLD : GOLD_DIM, alpha: (isPulse ? 1 : 0.7) * p * (1 - far * 0.75), drag: 0.6,
        });
      }
    }
    this.motes.update(dt);
    this.flame.update(dt);
  }

  public reset(): void {
    this.hasPosition = false;
    this.presence = 0;
    this.motes.clear();
    this.flame.clear();
  }
}
