import * as THREE from 'three';

/**
 * LightingSystem — Manages all scene lights.
 * Now supports dynamic ambient color/intensity transitions per zone.
 */
export class LightingSystem {
  public ambient: THREE.AmbientLight;
  public directional: THREE.DirectionalLight;

  private currentAmbientColor: THREE.Color = new THREE.Color(0xffffff);
  private currentAmbientIntensity: number = 2.0;

  constructor(scene: THREE.Scene) {
    // Ambient fill
    this.ambient = new THREE.AmbientLight(0xffffff, 2.0);
    scene.add(this.ambient);

    // Main directional (sun/moon)
    this.directional = new THREE.DirectionalLight(0xffffff, 5.0);
    this.directional.position.set(20, 40, 30);
    this.directional.castShadow = true;
    this.directional.shadow.mapSize.width = 2048;
    this.directional.shadow.mapSize.height = 2048;
    this.directional.shadow.camera.near = 0.5;
    this.directional.shadow.camera.far = 200;
    const d = 80; // Extended for larger level
    this.directional.shadow.camera.left = -d;
    this.directional.shadow.camera.right = d;
    this.directional.shadow.camera.top = d;
    this.directional.shadow.camera.bottom = -d;
    this.directional.shadow.bias = -0.001;
    scene.add(this.directional);
  }

  public update(dt: number, targetColor?: THREE.Color, targetIntensity?: number): void {
    if (targetColor !== undefined && targetIntensity !== undefined) {
      const lerpSpeed = dt * 2.0;
      this.currentAmbientColor.lerp(targetColor, lerpSpeed);
      this.currentAmbientIntensity = THREE.MathUtils.lerp(this.currentAmbientIntensity, targetIntensity, lerpSpeed);

      this.ambient.color.copy(this.currentAmbientColor);
      this.ambient.intensity = this.currentAmbientIntensity;
    }
  }
}
