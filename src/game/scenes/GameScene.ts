import * as THREE from 'three';

import { WorldGenerator } from '../world/WorldGenerator';

export class GameScene {
  public scene: THREE.Scene;

  constructor() {
    this.scene = new THREE.Scene();
    
    // Atmosphere Placeholder
    this.scene.background = new THREE.Color(0x060a10);
    this.scene.fog = new THREE.FogExp2(0x060a10, 0.02);

    // Lighting Placeholders
    const ambient = new THREE.AmbientLight(0x1a2a3a, 0.4);
    this.scene.add(ambient);
    
    const moonLight = new THREE.DirectionalLight(0x6688cc, 1.5);
    moonLight.position.set(-15, 25, -10);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 100;
    const d = 35;
    moonLight.shadow.camera.left = -d;
    moonLight.shadow.camera.right = d;
    moonLight.shadow.camera.top = d;
    moonLight.shadow.camera.bottom = -d;
    moonLight.shadow.bias = -0.0005;
    this.scene.add(moonLight);

    // Generate World
    new WorldGenerator(this.scene);
  }

  public update(_dt: number): void {
    // Environment animation (e.g. swaying trees/lanterns) will be added later
  }
}
