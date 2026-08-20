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

import { ZoneManager } from '../world/ZoneManager';
import { InteractionSystem } from '../interaction/InteractionSystem';
import { ShrineInteraction } from '../interaction/ShrineInteraction';
import { ObjectiveManager } from '../progression/ObjectiveManager';
import { ObjectiveUI } from '../ui/ObjectiveUI';
import { EncounterTelegraphVFX } from '../vfx/EncounterTelegraphVFX';

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
  
  private zoneManager: ZoneManager;
  private interactionSystem: InteractionSystem;
  private objectiveManager: ObjectiveManager;
  private objectiveUI: ObjectiveUI;
  private telegraphVfx: EncounterTelegraphVFX;

  constructor(cameraController: CameraController) {
    this.cameraController = cameraController;
    this.scene = new THREE.Scene();
    
    this.atmosphere = new AtmosphereSystem(this.scene);
    this.lighting = new LightingSystem(this.scene);
    this.zoneManager = new ZoneManager();

    this.collisionSystem = new CollisionSystem();
    new WorldGenerator(this.scene, this.collisionSystem);
    this.hitboxSystem = new HitboxSystem(this.scene);
    this.projectileSystem = new ProjectileSystem(this.scene);

    this.player = new Ronin();
    this.player.setPosition(0, 0, 50); // Start at entrance
    this.scene.add(this.player.root);

    this.encounterManager = new EncounterManager();
    this.attackDirector = new AttackDirector();

    // COURTYARD ENCOUNTER
    this.encounterManager.registerEncounter({
      id: 'enc_courtyard',
      center: new THREE.Vector3(0, 0, 15),
      activationRadius: 15,
      leashRadius: 25,
      waves: [
        { enemies: [{ type: 'BASIC_YOKAI', offset: new THREE.Vector3(-2, 0, 0) }, { type: 'BASIC_YOKAI', offset: new THREE.Vector3(2, 0, 0) }], delayAfterComplete: 0 }
      ]
    });

    // SHRINE ENCOUNTER
    this.encounterManager.registerEncounter({
      id: 'enc_shrine',
      center: new THREE.Vector3(0, 0, -10),
      activationRadius: 12,
      leashRadius: 20,
      waves: [
        { enemies: [{ type: 'SHADOW_YOKAI', offset: new THREE.Vector3(-2, 0, 0) }, { type: 'TENGU', offset: new THREE.Vector3(2, 0, 0) }], delayAfterComplete: 0 }
      ]
    });

    // FOREST ENCOUNTER
    this.encounterManager.registerEncounter({
      id: 'enc_forest',
      center: new THREE.Vector3(0, 0, -35),
      activationRadius: 10,
      leashRadius: 18,
      waves: [
        { enemies: [{ type: 'BASIC_YOKAI', offset: new THREE.Vector3(0, 0, -2) }, { type: 'SHADOW_YOKAI', offset: new THREE.Vector3(0, 0, 2) }], delayAfterComplete: 0 }
      ]
    });
    
    // TEMPLE APPROACH ENCOUNTER
    this.encounterManager.registerEncounter({
      id: 'enc_temple',
      center: new THREE.Vector3(0, 0, -60),
      activationRadius: 14,
      leashRadius: 22,
      waves: [
        { enemies: [{ type: 'BASIC_YOKAI', offset: new THREE.Vector3(-2, 0, 0) }, { type: 'SHADOW_YOKAI', offset: new THREE.Vector3(2, 0, 0) }], delayAfterComplete: 1.5 },
        { enemies: [{ type: 'SHADOW_YOKAI', offset: new THREE.Vector3(0, 0, -3) }, { type: 'TENGU', offset: new THREE.Vector3(0, 0, 3) }], delayAfterComplete: 0 }
      ]
    });

    this.vfx = new VFXManager(this.scene, this.cameraController);
    this.telegraphVfx = new EncounterTelegraphVFX(this.scene, this.encounterManager);

    this.interactionSystem = new InteractionSystem();
    // Register the main shrine
    this.interactionSystem.register(new ShrineInteraction(new THREE.Vector3(0, 0, -10)));

    this.objectiveManager = new ObjectiveManager();
    this.objectiveUI = new ObjectiveUI();

    EventBus.on('restartEncounter', () => {
      this.resetEncounter();
    });
    
    EventBus.on('shrineActivated', () => {
      this.player['health'].heal(this.player['health'].maxHealth);
      EventBus.emit('playerHealth', { current: this.player['health']['currentHealth'], max: this.player['health']['maxHealth'], delta: 0 });
    });

    setTimeout(() => {
      EventBus.emit('playerHealth', { current: this.player['health']['currentHealth'], max: this.player['health']['maxHealth'], delta: 0 });
    }, 100);
  }

  private time: number = 0;

  public update(dt: number, inputManager: InputManager): void {
    this.time += dt;

    if (inputManager.isPressed('KeyR')) {
      this.resetEncounter();
    }

    this.vfx.update(dt);
    this.telegraphVfx.update(dt, this.time);

    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      return; 
    }

    // Zone & Atmosphere updates
    const playerPos = this.player.root.position;
    const { fogDensity, fogColor, ambientColor, ambientIntensity } = this.zoneManager.getBlendedAtmosphere(playerPos);
    this.atmosphere.update(dt, fogDensity, fogColor);
    this.lighting.update(dt, ambientColor, ambientIntensity);
    
    const zoneId = this.zoneManager.getCurrentZoneId();
    this.objectiveManager.onZoneEntered(zoneId);

    // Systems updates
    this.interactionSystem.update(playerPos, inputManager);
    this.hitboxSystem.clearActiveHitboxes();
    this.player.update(dt, inputManager, this.collisionSystem, this.hitboxSystem, this.vfx);
    this.projectileSystem.update(dt, this.player, this.vfx, this.cameraController);
    
    // Encounter Update
    this.encounterManager.update(dt, playerPos, this.scene);
    this.enemies = this.encounterManager.getActiveEnemies();
    
    // Group AI Update
    this.attackDirector.update(dt, this.enemies, playerPos);

    for (const enemy of this.enemies) {
      enemy.update(dt, playerPos, this.hitboxSystem, this.collisionSystem, this.vfx, this.projectileSystem, this.enemies);
    }

    const hits = this.hitboxSystem.checkHits();
    if (hits.length > 0) {
      const { hitStopTime, result } = DamageSystem.resolveHits(
        hits, this.player, this.enemies, this.vfx, this.cameraController
      );
      this.hitStopTimer = hitStopTime;

      // Update UI for the enemy that was hit
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
    }

    this.hitboxSystem.update();
  }

  public resetEncounter(): void {
    this.player.reset(new THREE.Vector3(0, 0, 50));
    this.encounterManager.resetAll(this.scene);
    
    this.hitboxSystem.clearActiveHitboxes();
    this.projectileSystem.clearAll();
    this.hitStopTimer = 0;
    
    EventBus.emit('playerHealth', { current: this.player['health']['currentHealth'], max: this.player['health']['maxHealth'], delta: 0 });
  }
}
