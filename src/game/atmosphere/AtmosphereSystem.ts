import * as THREE from 'three';
import { SkyDome } from './SkyDome';
import { GroundMist } from './GroundMist';

/**
 * AtmosphereSystem — Fog, sky and ground mist, blended per zone.
 */
export class AtmosphereSystem {
  private scene: THREE.Scene;
  private currentFogDensity: number = 0.008;
  private currentFogColor: THREE.Color = new THREE.Color(0x1c2a44);
  private sky: SkyDome;
  private mist: GroundMist;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.fog = new THREE.FogExp2(this.currentFogColor.getHex(), this.currentFogDensity);
    this.sky = new SkyDome(scene);
    this.mist = new GroundMist(scene);
    this.sky.update(0, this.currentFogColor);
  }

  public update(dt: number, center: THREE.Vector3, targetFogDensity: number, targetFogColor: THREE.Color): void {
    const lerpSpeed = Math.min(1, dt * 2.0);
    this.currentFogDensity = THREE.MathUtils.lerp(this.currentFogDensity, targetFogDensity, lerpSpeed);
    this.currentFogColor.lerp(targetFogColor, lerpSpeed);

    const fog = this.scene.fog as THREE.FogExp2;
    fog.density = this.currentFogDensity;
    fog.color.copy(this.currentFogColor);

    this.sky.update(dt, this.currentFogColor);
    this.mist.update(dt, center, this.currentFogColor);
  }
}
