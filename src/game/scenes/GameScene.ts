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
import { EncounterDatabase } from '../encounters/EncounterDatabase';
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

import { PlayerProgress } from '../progression/PlayerProgress';
import { PlayerStats } from '../progression/PlayerStats';
import { RewardSystem } from '../progression/RewardSystem';
import { AudioManager } from '../audio/AudioManager';
import { AudioZoneManager } from '../audio/AudioZoneManager';
import { CrimsonOni } from '../boss/CrimsonOni';
import { Boss } from '../boss/Boss';
import { BossIntroCamera } from '../boss/arena/BossIntroCamera';
import { BossUI } from '../ui/BossUI';
import { ArenaHazardSystem } from '../boss/arena/ArenaHazardSystem';
import { ArenaGenerator } from '../boss/arena/ArenaGenerator';
import { BossPhaseId } from '../boss/BossPhase';

export class GameScene {
  public scene: THREE.Scene;
  public player: Ronin;
  public collisionSystem: CollisionSystem;
  public hitboxSystem: HitboxSystem;
  public projectileSystem: ProjectileSystem;
  public arenaHazardSystem: ArenaHazardSystem;
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

  private playerProgress: PlayerProgress;
  private playerStats: PlayerStats;
  private rewardSystem: RewardSystem;

  // ─── Boss (Phase 4) ───────────────────────────────────────────────
  private boss: CrimsonOni | null = null;
  private audioZoneManager: AudioZoneManager;
  private bossIntroCamera: BossIntroCamera;
  private bossUI: BossUI;
  private bossIsDefeatedSequence: boolean = false;
  private purificationTimer: number = 0;
  private hasBossIntroPlayed: boolean = false;
  private isCinematicActive: boolean = false;
  private hasShownTitle: boolean = false;

  constructor(cameraController: CameraController) {
    AudioManager.init();
    
    this.cameraController = cameraController;
    this.scene = new THREE.Scene();
    
    this.atmosphere = new AtmosphereSystem(this.scene);
    this.lighting = new LightingSystem(this.scene);
    this.zoneManager = new ZoneManager();

    this.collisionSystem = new CollisionSystem();
    new WorldGenerator(this.scene, this.collisionSystem);
    this.hitboxSystem = new HitboxSystem(this.scene);
    this.projectileSystem = new ProjectileSystem(this.scene);
    this.arenaHazardSystem = new ArenaHazardSystem(this.scene);

    this.playerProgress = new PlayerProgress();
    this.playerStats = new PlayerStats(this.playerProgress.level);
    this.rewardSystem = new RewardSystem(this.playerProgress);

    this.bossIntroCamera = new BossIntroCamera(this.cameraController);
    this.bossUI = new BossUI();

    this.player = new Ronin();
    this.applyPlayerStats();
    
    // Ensure player is instantiated before AudioZoneManager (though AudioZoneManager doesn't take args currently)
    this.audioZoneManager = new AudioZoneManager();

    this.player.setPosition(0, 0, 50); // Start at entrance
    this.scene.add(this.player.root);

    this.encounterManager = new EncounterManager();
    this.attackDirector = new AttackDirector();

    // Register encounters from database
    const configs = EncounterDatabase.getAll();
    for (const config of configs) {
      if (!this.playerProgress.hasClearedEncounter(config.id)) {
        this.encounterManager.registerEncounter(config);
      }
    }

    this.vfx = new VFXManager(this.scene, this.cameraController);
    this.telegraphVfx = new EncounterTelegraphVFX(this.scene, this.encounterManager);

    this.interactionSystem = new InteractionSystem();
    this.interactionSystem.register(new ShrineInteraction(new THREE.Vector3(0, 0, -10)));

    this.objectiveManager = new ObjectiveManager();
    this.objectiveUI = new ObjectiveUI();

    // Boss is in the Boss Arena
    if (!this.playerProgress.crimsonOniDefeated) {
      this.boss = new CrimsonOni();
      this.boss.reset(new THREE.Vector3(0, 0, -135)); // Boss Arena center
      this.scene.add(this.boss.root);
    } else {
      this.boss = null;
    }

    EventBus.on('restartEncounter', () => {
      this.resetEncounter();
    });
    
    EventBus.on('shrineActivated', () => {
      this.player['health'].heal(this.player['health'].maxHealth);
      EventBus.emit('playerHealth', { current: this.player['health']['currentHealth'], max: this.player['health']['maxHealth'], delta: 0 });
    });

    EventBus.on('levelUp', (data: any) => {
      this.playerStats.applyLevel(data.level);
      this.applyPlayerStats();
      this.player['health'].heal(this.player['health'].maxHealth); // Full heal on level up
      EventBus.emit('playerHealth', { current: this.player['health']['currentHealth'], max: this.player['health']['maxHealth'], delta: 0 });
    });

    EventBus.on('bossPhaseTransition', (data: any) => {
      // Lock player controls during transformation
      this.player.isControlsEnabled = false;
      this.cameraController.addShake(3.0); // Heavy sustained shake
      
      if (ArenaGenerator.corruptionMat) {
        (ArenaGenerator.corruptionMat as THREE.MeshBasicMaterial).opacity = data.phase === BossPhaseId.PHASE_2 ? 0.4 : 0.8;
      }

      setTimeout(() => {
        this.player.isControlsEnabled = true;
      }, 2500);
    });

    EventBus.on('bossDeath', (data: any) => {
      this.bossIsDefeatedSequence = true;
      this.purificationTimer = 0;
      this.player.isControlsEnabled = false;
      
      // Heavy hit stop & shake
      this.hitStopTimer = 0.5;
      this.cameraController.addShake(5.0);
      
      // Look at boss
      if (this.boss) {
        this.cameraController.overrideTarget = this.boss.root.position.clone();
        this.cameraController.overrideZoom = 1.8;
      }

      // Energy VFX
      this.vfx.spawnBossDeathEnergy(data.position);
      
      // Sequence timing
      setTimeout(() => {
        // Reward
        this.playerProgress.addEssence(500);
        this.playerProgress.crimsonOniDefeated = true;
        this.playerProgress.save();
        
        // Restore camera and controls
        this.cameraController.overrideTarget = null;
        this.cameraController.overrideZoom = null;
        this.player.isControlsEnabled = true;
      }, 7000);
    });

    EventBus.on('spawnBossProjectile', (data: any) => {
      this.projectileSystem.spawnProjectile(
        data.ownerId,
        data.startPos,
        data.direction,
        data.speed,
        data.damage,
        data.knockback,
        3.0,
        'CRIMSON_ARC'
      );
    });

    EventBus.on('spawnBossHazard', (data: any) => {
      const bossPos = this.boss ? this.boss.root.position : new THREE.Vector3();
      const playerPos = this.player.root.position;

      if (data.type === 'RAIN') {
        // Spawn 3 hazards near player
        for (let i = 0; i < 3; i++) {
          const offset = new THREE.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6);
          this.arenaHazardSystem.spawnHazard({
            position: playerPos.clone().add(offset),
            radius: 3.5,
            damage: data.damage,
            telegraphDuration: 1.5,
            activeDuration: 0.5
          });
        }
      } else if (data.type === 'ERUPTION') {
        // Large AOE around player and boss
        this.arenaHazardSystem.spawnHazard({
          position: bossPos.clone(),
          radius: 8.0,
          damage: data.damage,
          telegraphDuration: 2.0,
          activeDuration: 1.0
        });
        this.arenaHazardSystem.spawnHazard({
          position: playerPos.clone(),
          radius: 6.0,
          damage: data.damage,
          telegraphDuration: 2.0,
          activeDuration: 1.0
        });
      }
    });

    setTimeout(() => {
      EventBus.emit('playerHealth', { current: this.player['health']['currentHealth'], max: this.player['health']['maxHealth'], delta: 0 });
      EventBus.emit('essenceUpdate', { amount: this.playerProgress.spiritEssence, added: 0 });
      EventBus.emit('levelUp', { level: this.playerProgress.level }); // Init UI
    }, 100);
  }

  private applyPlayerStats(): void {
    this.player['health'].maxHealth = this.playerStats.maxHealth;
    this.player['health'].currentHealth = this.playerStats.maxHealth;
    this.player['dashSystem']['dashCooldown'] = this.playerStats.dashCooldown;
    // movement speed etc can be applied here if exposed on player
  }

  private time: number = 0;

  public update(dt: number, inputManager: InputManager): void {
    this.time += dt;

    if (inputManager.isPressed('KeyR')) {
      this.resetEncounter();
    }

    this.vfx.update(dt, this.time);
    this.telegraphVfx.update(dt, this.time);

    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      return; 
    }

    // Zone & Atmosphere updates
    const playerPos = this.player.root.position;
    let { fogDensity, fogColor, ambientColor, ambientIntensity } = this.zoneManager.getBlendedAtmosphere(playerPos);

    if (this.bossIsDefeatedSequence || this.playerProgress.crimsonOniDefeated) {
      // Force purified atmosphere in boss arena
      if (this.zoneManager.getCurrentZoneId() === 'BOSS_ARENA') {
        fogColor = new THREE.Color(0x111520);
        fogDensity = 0.015;
        ambientColor = new THREE.Color(0xffcccc);
        ambientIntensity = 3.0;
      }

      if (this.bossIsDefeatedSequence) {
        this.purificationTimer += dt;
        ArenaGenerator.purifyArena(dt);
        if (this.purificationTimer > 8.0) {
          this.bossIsDefeatedSequence = false;
          if (this.boss) {
            this.scene.remove(this.boss.root);
            this.boss = null;
          }
        }
      }
    } else if (this.boss && this.boss.phase === BossPhaseId.PHASE_2) {
      fogColor = new THREE.Color(0x330000);
      fogDensity = 0.03;
      ambientColor = new THREE.Color(0xff4444);
      ambientIntensity = 2.0;
    } else if (this.boss && this.boss.phase === BossPhaseId.PHASE_3) {
      fogColor = new THREE.Color(0x440000);
      fogDensity = 0.04;
      ambientColor = new THREE.Color(0xff2222);
      ambientIntensity = 2.5;
    }

    this.atmosphere.update(dt, fogDensity, fogColor);
    this.lighting.update(dt, ambientColor, ambientIntensity);
    const zoneId = this.zoneManager.getCurrentZoneId();
    this.objectiveManager.onZoneEntered(zoneId);

    // Systems updates
    this.interactionSystem.update(playerPos, inputManager);
    this.hitboxSystem.clearActiveHitboxes();
    this.player.update(dt, inputManager, this.collisionSystem, this.hitboxSystem, this.vfx);
    
    // Projectile & Hazard System update
    this.projectileSystem.update(dt, this.player, this.vfx, this.cameraController);
    this.arenaHazardSystem.update(dt, this.player);
    
    // Encounter Update
    this.encounterManager.update(dt, playerPos, this.scene);
    this.enemies = this.encounterManager.getActiveEnemies();
    
    // Group AI Update
    this.attackDirector.update(dt, this.enemies, playerPos);

    for (const enemy of this.enemies) {
      enemy.update(dt, playerPos, this.hitboxSystem, this.collisionSystem, this.vfx, this.projectileSystem, this.enemies);
    }

    // ─── Boss Update ──────────────────────────────────────────────
    
    // Trigger Cinematic Intro
    if (this.boss && this.player.root.position.z < -90 && !this.hasBossIntroPlayed) {
      this.hasBossIntroPlayed = true;
      this.isCinematicActive = true;
      this.hasShownTitle = false;
      this.player.isControlsEnabled = false;
      
      AudioManager.playBossIntro();
      this.boss.startIntro();
      this.bossIntroCamera.start(this.boss.root.position, this.player.root.position);
    }

    if (this.isCinematicActive && this.boss) {
      this.bossIntroCamera.update(dt, this.player.root.position, this.boss.root.position);
      
      if (this.bossIntroCamera.isHolding && !this.hasShownTitle) {
        this.bossUI.showCinematicTitle('Crimson Oni', 2500);
        this.hasShownTitle = true;
      }
      
      if (!this.bossIntroCamera.isActive) {
        this.isCinematicActive = false;
        this.player.isControlsEnabled = true;
        this.boss.endIntro();
        this.bossUI.showHealthBar('Crimson Oni');
        AudioManager.playBossPhase(1);
      }
    }

    if (this.boss) {
      // Don't update boss combat AI if cinematic is active
      if (!this.isCinematicActive) {
        this.boss.update(dt, this.player.root.position, this.hitboxSystem, this.collisionSystem, this.vfx);
      } else {
        // Still update animation during cinematic
        this.boss.update(dt, this.boss.root.position.clone(), this.hitboxSystem, this.collisionSystem, this.vfx);
      }
    }

    // ─── Hit Resolution ─────────────────────────────────────────────
    const hits = this.hitboxSystem.checkHits();
    if (hits.length > 0) {
      const { hitStopTime, result } = DamageSystem.resolveHits(
        hits, this.player, this.enemies, this.vfx, this.cameraController, this.boss
      );
      this.hitStopTimer = hitStopTime;

      // Check if boss was hit
      for (const hit of hits) {
        if (hit.hurtbox.id === 'CRIMSON_ONI' && this.boss) {
          this.boss.takeDamage(hit.hitbox.damage, hit.hitbox.direction, hit.hitbox.knockback);
          EventBus.emit('enemyHealth', {
            current: this.boss.health.currentHealth,
            max: this.boss.health.maxHealth,
            delta: -hit.hitbox.damage,
            name: 'CRIMSON ONI'
          });
          this.vfx.spawnHit(hit.hitbox.position, hit.hitbox.direction, true);
          this.cameraController.addShake(1.0);
          this.hitStopTimer = Math.max(this.hitStopTimer, 0.07);
        }
      }

      // Update UI for regular enemies that were hit
      const hitEnemy = hits.find(h => h.hurtbox.id !== 'player' && h.hurtbox.id !== 'CRIMSON_ONI');
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
    this.playerProgress.wipe();
    this.playerStats.applyLevel(1);
    this.applyPlayerStats();

    // Place player at entrance
    this.player.root.position.set(0, 0, 50);
    
    // Clear existing entities
    this.enemies.forEach(e => this.scene.remove(e.root));
    this.enemies = [];
    
    this.boss = null;
    this.projectileSystem.clearAll();
    this.arenaHazardSystem.reset();
    this.encounterManager.resetAll(this.scene);
    
    this.hasBossIntroPlayed = false;
    this.isCinematicActive = false;
    this.hasShownTitle = false;
    this.player.isControlsEnabled = true;
    this.bossUI.reset();

    // Spawn Boss in arena
    if (!this.boss) {
      this.boss = new CrimsonOni();
      this.scene.add(this.boss.root);
    }
    this.boss.reset(new THREE.Vector3(0, 0, -115)); // Back of arena
    
    this.hitboxSystem.clearActiveHitboxes();
    this.projectileSystem.clearAll();
    this.hitStopTimer = 0;
    
    EventBus.emit('playerHealth', { current: this.player['health']['currentHealth'], max: this.player['health']['maxHealth'], delta: 0 });
    EventBus.emit('essenceUpdate', { amount: 0, added: 0 });
    EventBus.emit('levelUp', { level: 1 });
  }
}
