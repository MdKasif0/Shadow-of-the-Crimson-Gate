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
    const ambient = new THREE.AmbientLight(0xffffff, 2.0);
    this.scene.add(ambient);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 5.0);
    dirLight.position.set(20, 40, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 200;
    const d = 50;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.001;
    this.scene.add(dirLight);

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
