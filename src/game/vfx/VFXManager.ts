import * as THREE from 'three';
import { SlashVFX } from './SlashVFX';
import { HitVFX } from './HitVFX';
import { DashVFX } from './DashVFX';
import { HurtVFX } from './HurtVFX';
import { DeathVFX } from './DeathVFX';
import { CameraController } from '../camera/CameraController';

/**
 * VFXManager — Thin orchestrator that delegates to individual VFX modules.
 */
export class VFXManager {
  private slash: SlashVFX;
  private hit: HitVFX;
  private dash: DashVFX;
  private hurt: HurtVFX;
  private death: DeathVFX;

  constructor(scene: THREE.Scene, _cameraController: CameraController) {
    this.slash = new SlashVFX(scene);
    this.hit = new HitVFX(scene);
    this.dash = new DashVFX(scene);
    this.hurt = new HurtVFX(scene);
    this.death = new DeathVFX(scene);
  }

  public update(dt: number): void {
    this.slash.update(dt);
    this.hit.update(dt);
    this.dash.update(dt);
    this.hurt.update(dt);
    this.death.update(dt);
  }

  // --- Public API (unchanged signatures) ---

  public spawnSlash(position: THREE.Vector3, direction: THREE.Vector3, type: number): void {
    this.slash.spawn(position, direction, type);
  }

  public spawnHit(position: THREE.Vector3, direction: THREE.Vector3, isHeavy: boolean): void {
    this.hit.spawn(position, direction, isHeavy);
  }

  public spawnHurt(position: THREE.Vector3): void {
    this.hurt.spawn(position);
  }

  public spawnDeath(position: THREE.Vector3): void {
    this.death.spawn(position);
  }

  public spawnDash(position: THREE.Vector3, rotationY: number): void {
    this.dash.spawn(position, rotationY);
  }
}
