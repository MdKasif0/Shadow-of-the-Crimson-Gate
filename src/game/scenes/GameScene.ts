import * as THREE from 'three';
import { WorldGenerator } from '../world/WorldGenerator';
import { Ronin } from '../characters/Ronin';
import { CollisionSystem } from '../collision/CollisionSystem';
import { HitboxSystem } from '../combat/HitboxSystem';
import { DamageSystem } from '../combat/DamageSystem';
import { InputManager } from '../core/InputManager';
import { Enemy } from '../enemies/Enemy';
import { CameraController } from '../camera/CameraController';
import { EncounterManager } from '../encounters/EncounterManager';
import { EncounterConfig } from '../encounters/EncounterConfig';
import { AttackDirector } from '../combat/AttackDirector';
import { VFXManager } from '../vfx/VFXManager';
import { EventBus } from '../core/EventBus';
import { LightingSystem } from '../lighting/LightingSystem';
import { AtmosphereSystem } from '../atmosphere/AtmosphereSystem';
import { ProjectileSystem } from '../combat/ProjectileSystem';

export class GameScene {
  public scene: THREE.Scene;
  public player: Ronin;
  public collisionSystem: CollisionSystem;
  public hitboxSystem: HitboxSystem;
  public projectileSystem: ProjectileSystem;
  public enemies: Enemy[] = [];
  public vfx: VFXManager;
  public cameraController: CameraController;
  
  private encounterManager: EncounterManager;
  private attackDirector: AttackDirector;
  
  private hitStopTimer: number = 0;

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
    this.projectileSystem = new ProjectileSystem(this.scene);

    this.player = new Ronin();
    this.player.setPosition(0, 0, 0);
    this.scene.add(this.player.root);

    this.encounterManager = new EncounterManager();
    this.attackDirector = new AttackDirector();

    // TEST ENCOUNTER A: 2 Basic Yokai
    this.encounterManager.registerEncounter({
      id: 'encA',
      center: new THREE.Vector3(-15, 0, -15),
      activationRadius: 15,
      leashRadius: 25,
      waves: [
        { enemies: [{ type: 'BASIC_YOKAI', offset: new THREE.Vector3(-2, 0, 0) }, { type: 'BASIC_YOKAI', offset: new THREE.Vector3(2, 0, 0) }], delayAfterComplete: 0 }
      ]
    });

    // TEST ENCOUNTER B: 1 Basic, 1 Shadow
    this.encounterManager.registerEncounter({
      id: 'encB',
      center: new THREE.Vector3(15, 0, -15),
      activationRadius: 15,
      leashRadius: 25,
      waves: [
        { enemies: [{ type: 'BASIC_YOKAI', offset: new THREE.Vector3(-2, 0, 0) }, { type: 'SHADOW_YOKAI', offset: new THREE.Vector3(2, 0, 0) }], delayAfterComplete: 0 }
      ]
    });

    // TEST ENCOUNTER C: 1 Basic, 1 Shadow, 1 Tengu (Waves)
    this.encounterManager.registerEncounter({
      id: 'encC',
      center: new THREE.Vector3(0, 0, -25),
      activationRadius: 15,
      leashRadius: 25,
      waves: [
        { enemies: [{ type: 'BASIC_YOKAI', offset: new THREE.Vector3(0, 0, 0) }], delayAfterComplete: 2.0 },
        { enemies: [{ type: 'SHADOW_YOKAI', offset: new THREE.Vector3(-2, 0, 0) }, { type: 'TENGU', offset: new THREE.Vector3(2, 0, 0) }], delayAfterComplete: 0 }
      ]
    });

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
    this.projectileSystem.update(dt, this.player, this.vfx, this.cameraController);
    // Encounter Update
    this.encounterManager.update(dt, this.player.root.position, this.scene);
    this.enemies = this.encounterManager.getActiveEnemies();
    
    // Group AI Update
    this.attackDirector.update(dt, this.enemies, this.player.root.position);

    for (const enemy of this.enemies) {
      enemy.update(dt, this.player.root.position, this.hitboxSystem, this.collisionSystem, this.vfx, this.projectileSystem, this.enemies);
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

      // We moved encounter complete logic to Encounter.ts
    }

    this.hitboxSystem.update();
  }

  public resetEncounter(): void {
    this.player.reset(new THREE.Vector3(0, 0, 0));
    this.encounterManager.resetAll(this.scene);
    
    this.hitboxSystem.clearActiveHitboxes();
    this.projectileSystem.clearAll();
    this.hitStopTimer = 0;
    
    EventBus.emit('playerHealth', { current: this.player['health']['currentHealth'], max: this.player['health']['maxHealth'], delta: 0 });
  }
}
