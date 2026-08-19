import * as THREE from 'three';
import { WorldGenerator } from '../world/WorldGenerator';
import { Ronin } from '../characters/Ronin';
import { CollisionSystem } from '../physics/CollisionSystem';
import { HitboxSystem } from '../physics/HitboxSystem';
import { InputManager } from '../core/InputManager';
import { EnemySpawner } from '../world/EnemySpawner';
import { Enemy } from '../enemies/Enemy';

export class GameScene {
  public scene: THREE.Scene;
  public player: Ronin;
  public collisionSystem: CollisionSystem;
  public hitboxSystem: HitboxSystem;
  public enemies: Enemy[] = [];

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

    // Generate World and Collisions
    this.collisionSystem = new CollisionSystem();
    new WorldGenerator(this.scene, this.collisionSystem);

    // Hitbox System
    this.hitboxSystem = new HitboxSystem(this.scene);

    // Generate Player (Ronin)
    this.player = new Ronin();
    this.player.setPosition(0, 0, 0); // Spawn area
    this.scene.add(this.player.root);

    // Generate Enemies
    const spawner = new EnemySpawner();
    const yokai = spawner.spawnBasicYokai(this.scene, new THREE.Vector3(10, 0, 10));
    this.enemies.push(yokai);
  }

  public update(dt: number, inputManager: InputManager): void {
    // 1. Clear hitboxes from last frame
    this.hitboxSystem.clearActiveHitboxes();

    // 2. Update entities (which may register hitboxes/hurtboxes)
    this.player.update(dt, inputManager, this.collisionSystem, this.hitboxSystem);
    
    for (const enemy of this.enemies) {
      enemy.update(dt, this.player.root.position, this.hitboxSystem);
    }

    // 3. Resolve combat interactions
    const hits = this.hitboxSystem.checkHits();
    for (const hit of hits) {
      const targetEnemy = this.enemies.find(e => e.id === hit.hurtbox.id);
      if (targetEnemy) {
        targetEnemy.takeDamage(hit.hitbox.damage, hit.hitbox.direction, hit.hitbox.knockback);
      }
    }

    // 4. Update debug visuals
    this.hitboxSystem.update();
  }
}
