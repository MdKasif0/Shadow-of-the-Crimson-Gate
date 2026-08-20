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

  private lighting: LightingSystem;
  private atmosphere: AtmosphereSystem;

  constructor(cameraController: CameraController) {
    this.cameraController = cameraController;
    this.scene = new THREE.Scene();
    
    this.atmosphere = new AtmosphereSystem(this.scene);
    this.lighting = new LightingSystem(this.scene);

    this.collisionSystem = new CollisionSystem();
    new WorldGenerator(this.scene, this.collisionSystem);
    this.hitboxSystem = new HitboxSystem(this.scene);

    this.player = new Ronin();
    this.player.setPosition(0, 0, 0);
    this.scene.add(this.player.root);

    // TEST ARENA: Spawn both Basic Yokai and Shadow Yokai
    const spawner = new EnemySpawner();
    const basicYokai = spawner.spawnBasicYokai(this.scene, new THREE.Vector3(-4, 0, -8));
    const shadowYokai = spawner.spawnShadowYokai(this.scene, new THREE.Vector3(4, 0, -8));
    
    this.enemies.push(basicYokai);
    this.enemies.push(shadowYokai);

    this.vfx = new VFXManager(this.scene, this.cameraController);

    EventBus.on('restartEncounter', () => {
      this.resetEncounter();
    });
    
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
      return; 
    }

    this.hitboxSystem.clearActiveHitboxes();
    this.player.update(dt, inputManager, this.collisionSystem, this.hitboxSystem, this.vfx);
    
    // Encounter Trigger Logic
    if (!this.encounterActive && !this.isEncounterCompleted) {
      for (const enemy of this.enemies) {
        if (enemy.health.isDead) continue;
        const dist = this.player.root.position.distanceTo(enemy.root.position);
        if (dist < 12) {
          this.encounterActive = true;
          EventBus.emit('encounterStarted');
          // For testing, just show the first alive enemy's health on trigger
          EventBus.emit('enemyHealth', { 
            current: enemy.health.currentHealth, 
            max: enemy.health.maxHealth, 
            delta: 0,
            name: enemy.enemyType.replace('_', ' ')
          });
          break;
        }
      }
    }

    for (const enemy of this.enemies) {
      if (this.encounterActive || this.isEncounterCompleted) {
        enemy.update(dt, this.player.root.position, this.hitboxSystem, this.collisionSystem, this.vfx);
      }
    }

    const hits = this.hitboxSystem.checkHits();
    if (hits.length > 0) {
      const { hitStopTime, result } = DamageSystem.resolveHits(
        hits, this.player, this.enemies, this.vfx, this.cameraController
      );
      this.hitStopTimer = hitStopTime;

      // Update UI for the enemy that was hit (if any)
      const hitEnemy = hits.find(h => h.hurtbox.id !== 'player');
      if (hitEnemy) {
        const enemy = this.enemies.find(e => e.id === hitEnemy.hurtbox.id);
        if (enemy) {
          EventBus.emit('enemyHealth', { 
            current: enemy.health.currentHealth, 
            max: enemy.health.maxHealth, 
            delta: hitEnemy.hitbox.damage,
            name: enemy.enemyType.replace('_', ' ')
          });
        }
      }

      // Check if ALL enemies are dead
      if (!this.isEncounterCompleted && this.enemies.every(e => e.health.isDead)) {
        this.encounterActive = false;
        this.isEncounterCompleted = true;
        EventBus.emit('encounterComplete');
      }
    }

    this.hitboxSystem.update();
  }

  public resetEncounter(): void {
    this.player.reset(new THREE.Vector3(0, 0, 0));
    
    if (this.enemies[0]) this.enemies[0].reset(new THREE.Vector3(-4, 0, -8));
    if (this.enemies[1]) this.enemies[1].reset(new THREE.Vector3(4, 0, -8));
    
    this.hitboxSystem.clearActiveHitboxes();
    this.hitStopTimer = 0;
    
    this.encounterActive = false;
    this.isEncounterCompleted = false;

    EventBus.emit('playerHealth', { current: this.player['health']['currentHealth'], max: this.player['health']['maxHealth'], delta: 0 });
    EventBus.emit('encounterComplete'); 
  }
}
