import * as THREE from 'three';
import { EventBus } from '../core/EventBus';

/**
 * LightingSystem — Manages all scene lights.
 * Extracted from GameScene constructor.
 */
export class LightingSystem {
  public ambient: THREE.AmbientLight;
  public directional: THREE.DirectionalLight;

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
    const d = 50;
    this.directional.shadow.camera.left = -d;
    this.directional.shadow.camera.right = d;
    this.directional.shadow.camera.top = d;
    this.directional.shadow.camera.bottom = -d;
    this.directional.shadow.bias = -0.001;
    scene.add(this.directional);

    EventBus.on('atmosphereChanged', (data: any) => {
      this.ambient.color.copy(data.ambientColor);
      this.directional.intensity = data.directionalIntensity;
    });
  }
}
