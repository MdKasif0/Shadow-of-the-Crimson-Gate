import * as THREE from 'three';

/**
 * AtmosphereSystem — Manages scene background color, fog, and overall mood.
 * Extracted from GameScene constructor.
 */
export class AtmosphereSystem {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.background = new THREE.Color(0x060a10);
    this.scene.fog = new THREE.FogExp2(0x060a10, 0.02);
  }

  /** Future: update fog density, time-of-day shifts, etc. */
  public update(_dt: number): void {
    // Stub for future atmospheric effects
  }

  public setFogParams(color: THREE.Color, density: number): void {
    this.scene.background = color;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color = color;
      this.scene.fog.density = density;
    } else {
      this.scene.fog = new THREE.FogExp2(color, density);
    }
  }
}
