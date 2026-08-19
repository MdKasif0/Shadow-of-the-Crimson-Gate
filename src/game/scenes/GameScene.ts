import * as THREE from 'three';
import { WorldGenerator } from '../world/WorldGenerator';
import { Ronin } from '../characters/Ronin';

export class GameScene {
  public scene: THREE.Scene;
  public player: Ronin;
  private animTimer: number = 0;

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

    // Generate Player (Ronin)
    this.player = new Ronin();
    this.player.setPosition(0, 0, 0); // Spawn area
    this.scene.add(this.player.root);
  }

  public update(dt: number): void {
    // Test animation toggle every 3 seconds
    this.animTimer += dt;
    if (this.animTimer > 6) {
      this.animTimer = 0;
    } else if (this.animTimer > 3) {
      this.player.playWalk();
    } else {
      this.player.playIdle();
    }

    this.player.update(dt);
  }
}
