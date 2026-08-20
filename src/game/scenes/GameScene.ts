import * as THREE from 'three';
import { WorldGenerator } from '../world/WorldGenerator';
import { Ronin } from '../characters/Ronin';
import { CollisionSystem } from '../collision/CollisionSystem';
import { HitboxSystem } from '../combat/HitboxSystem';
import { DamageSystem } from '../combat/DamageSystem';
import { InputManager } from '../core/InputManager';
import { EnemySpawner } from '../world/EnemySpawner';
import { Enemy } from '../enemies/Enemy';
import { CameraController } from '../camera/CameraController';
import { VFXManager } from '../vfx/VFXManager';
import { EventBus } from '../core/EventBus';
import { LightingSystem } from '../lighting/LightingSystem';
import { AtmosphereSystem } from '../atmosphere/AtmosphereSystem';

export class GameScene {
  public scene: THREE.Scene;
  public player: Ronin;
  public collisionSystem: CollisionSystem;
  public hitboxSystem: HitboxSystem;
  public enemies: Enemy[] = [];
  public vfx: VFXManager;
  public cameraController: CameraController;
  
  private hitStopTimer: number = 0;
  private encounterActive: boolean = false;
  private isEncounterCompleted: boolean = false;

  // Extracted systems
  private lighting: LightingSystem;
  private atmosphere: AtmosphereSystem;

  constructor(cameraController: CameraController) {
    this.cameraController = cameraController;
    this.scene = new THREE.Scene();
    
    // Atmosphere & Lighting (extracted)
    this.atmosphere = new AtmosphereSystem(this.scene);
    this.lighting = new LightingSystem(this.scene);

    // Generate World and Collisions
    this.collisionSystem = new CollisionSystem();
    new WorldGenerator(this.scene, this.collisionSystem);

    // Hitbox System
    this.hitboxSystem = new HitboxSystem(this.scene);

    // Generate Player (Ronin)
    this.player = new Ronin();
    this.player.setPosition(0, 0, 0);
    this.scene.add(this.player.root);

    // Generate Enemies
    const spawner = new EnemySpawner();
    // Spawn far enough away so encounter doesn't start instantly, and in open space
    const yokai = spawner.spawnBasicYokai(this.scene, new THREE.Vector3(0, 0, -8));
    this.enemies.push(yokai);

    // Initialize VFX
    this.vfx = new VFXManager(this.scene, this.cameraController);

    // Event Bus Bindings
    EventBus.on('restartEncounter', () => {
      this.resetEncounter();
    });
    
    // Initial UI state
    setTimeout(() => {
      EventBus.emit('playerHealth', { current: this.player['health']['currentHealth'], max: this.player['health']['maxHealth'], delta: 0 });
    }, 100);
  }

  public update(dt: number, inputManager: InputManager): void {
    if (inputManager.isPressed('KeyR')) {
      this.resetEncounter();
    }

    this.vfx.update(dt);

    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      return; // Skip entity updates to create freeze-frame
    }

    // 1. Clear hitboxes from last frame
    this.hitboxSystem.clearActiveHitboxes();

    // 2. Update entities
    this.player.update(dt, inputManager, this.collisionSystem, this.hitboxSystem, this.vfx);
    
    // Encounter Trigger Logic
    const yokai = this.enemies[0];
    if (yokai && !this.encounterActive && !this.isEncounterCompleted) {
       const dist = this.player.root.position.distanceTo(yokai.root.position);
       if (dist < 10) {
         this.encounterActive = true;
         EventBus.emit('encounterStarted');
         EventBus.emit('enemyHealth', { current: yokai.health['currentHealth'], max: yokai.health['maxHealth'], delta: 0 });
       }
    }

    for (const enemy of this.enemies) {
      // Only update enemy AI if encounter is active or completed (dying)
      if (this.encounterActive || this.isEncounterCompleted) {
        enemy.update(dt, this.player.root.position, this.hitboxSystem, this.collisionSystem, this.vfx);
      }
    }

    // 3. Resolve combat interactions via DamageSystem
    const hits = this.hitboxSystem.checkHits();
    if (hits.length > 0) {
      const { hitStopTime, result } = DamageSystem.resolveHits(
        hits, this.player, this.enemies, this.vfx, this.cameraController
      );
      this.hitStopTimer = hitStopTime;

      if (result.enemyKilled && !this.isEncounterCompleted) {
        this.encounterActive = false;
        this.isEncounterCompleted = true;
        EventBus.emit('encounterComplete');
      }
    }

    // 4. Update debug visuals
    this.hitboxSystem.update();
  }

  public resetEncounter(): void {
    // Reset player
    this.player.reset(new THREE.Vector3(0, 0, 0));
    // Reset enemy
    if (this.enemies[0]) {
      this.enemies[0].reset(new THREE.Vector3(0, 0, -8));
    }
    // Clean Hitboxes
    this.hitboxSystem.clearActiveHitboxes();
    this.hitStopTimer = 0;
    
    // Reset states
    this.encounterActive = false;
    this.isEncounterCompleted = false;

    // Refresh UI
    EventBus.emit('playerHealth', { current: this.player['health']['currentHealth'], max: this.player['health']['maxHealth'], delta: 0 });
    
    if (this.enemies[0]) {
      EventBus.emit('enemyHealth', { current: this.enemies[0].health['currentHealth'], max: this.enemies[0].health['maxHealth'], delta: 0 });
    }
    EventBus.emit('encounterComplete'); // Hide enemy HP bar on reset
  }
}
