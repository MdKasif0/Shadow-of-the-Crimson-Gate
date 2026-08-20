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
import { InteractionSystem } from '../core/InteractionSystem';
import { ZoneManager } from '../world/ZoneManager';

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
  
  private interactionSystem: InteractionSystem;
  private zoneManager: ZoneManager;

  constructor(cameraController: CameraController) {
    this.cameraController = cameraController;
    this.scene = new THREE.Scene();
    
    this.atmosphere = new AtmosphereSystem(this.scene);
    this.lighting = new LightingSystem(this.scene);

    this.collisionSystem = new CollisionSystem();
    this.hitboxSystem = new HitboxSystem(this.scene);
    this.projectileSystem = new ProjectileSystem(this.scene);

    this.player = new Ronin();
    this.player.setPosition(0, 0, 30); // Start in ENTRANCE
    this.scene.add(this.player.root);

    this.interactionSystem = new InteractionSystem();

    new WorldGenerator(this.scene, this.collisionSystem, this.interactionSystem, this.player);

    this.encounterManager = new EncounterManager();
    this.attackDirector = new AttackDirector();
    this.zoneManager = new ZoneManager(this.atmosphere, this.encounterManager);

    // COURTYARD_BATTLE: 2 Basic Yokai
    this.encounterManager.registerEncounter({
      id: 'COURTYARD_BATTLE',
      center: new THREE.Vector3(0, 0, -10),
      activationRadius: 15,
      leashRadius: 25,
      waves: [
        { enemies: [{ type: 'BASIC_YOKAI', offset: new THREE.Vector3(-3, 0, -2) }, { type: 'BASIC_YOKAI', offset: new THREE.Vector3(3, 0, -2) }], delayAfterComplete: 0 }
      ]
    });

    // SHRINE_BATTLE: 1 Shadow, 1 Tengu
    this.encounterManager.registerEncounter({
      id: 'SHRINE_BATTLE',
      center: new THREE.Vector3(-25, 0, -20),
      activationRadius: 15,
      leashRadius: 25,
      waves: [
        { enemies: [{ type: 'SHADOW_YOKAI', offset: new THREE.Vector3(0, 0, 4) }, { type: 'TENGU', offset: new THREE.Vector3(0, 0, -4) }], delayAfterComplete: 0 }
      ]
    });

    // FOREST_BATTLE: Basic + Shadow
    this.encounterManager.registerEncounter({
      id: 'FOREST_BATTLE',
      center: new THREE.Vector3(25, 0, -25),
      activationRadius: 15,
      leashRadius: 25,
      waves: [
        { enemies: [{ type: 'BASIC_YOKAI', offset: new THREE.Vector3(-2, 0, 0) }, { type: 'SHADOW_YOKAI', offset: new THREE.Vector3(2, 0, 0) }], delayAfterComplete: 0 }
      ]
    });

    // TEMPLE_BATTLE: Mixed Wave
    this.encounterManager.registerEncounter({
      id: 'TEMPLE_BATTLE',
      center: new THREE.Vector3(0, 0, -50),
      activationRadius: 20,
      leashRadius: 35,
      waves: [
        { enemies: [{ type: 'BASIC_YOKAI', offset: new THREE.Vector3(-4, 0, 0) }, { type: 'SHADOW_YOKAI', offset: new THREE.Vector3(4, 0, 0) }], delayAfterComplete: 2.0 },
        { enemies: [{ type: 'TENGU', offset: new THREE.Vector3(0, 0, 0) }], delayAfterComplete: 0 }
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
    this.interactionSystem.update(this.player.root.position, inputManager);
    this.zoneManager.update(dt, this.player.root.position);
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
