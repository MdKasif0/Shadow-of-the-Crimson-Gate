import * as THREE from 'three';

/**
 * AtmosphereSystem — Manages scene background color, fog, and overall mood.
 * Now supports dynamic zone-based transitions.
 */
export class AtmosphereSystem {
  private scene: THREE.Scene;
  private currentFogDensity: number = 0.02;
  private currentFogColor: THREE.Color = new THREE.Color(0x060a10);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.background = new THREE.Color(0x060a10);
    this.scene.fog = new THREE.FogExp2(0x060a10, 0.02);
  }

  public update(dt: number, targetFogDensity?: number, targetFogColor?: THREE.Color): void {
    if (targetFogDensity !== undefined && targetFogColor !== undefined) {
      const lerpSpeed = dt * 2.0; // Smooth transition
      this.currentFogDensity = THREE.MathUtils.lerp(this.currentFogDensity, targetFogDensity, lerpSpeed);
      this.currentFogColor.lerp(targetFogColor, lerpSpeed);

      const fog = this.scene.fog as THREE.FogExp2;
      fog.density = this.currentFogDensity;
      fog.color.copy(this.currentFogColor);
      (this.scene.background as THREE.Color).copy(this.currentFogColor);
    }
  }
}
