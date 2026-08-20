import * as THREE from 'three';
import { WorldGenerator } from '../world/WorldGenerator';
import { Ronin } from '../characters/Ronin';
import { CollisionSystem } from '../physics/CollisionSystem';
import { HitboxSystem } from '../physics/HitboxSystem';
import { InputManager } from '../core/InputManager';
import { EnemySpawner } from '../world/EnemySpawner';
import { Enemy } from '../enemies/Enemy';
import { CameraController } from '../core/CameraController';
import { VFXManager } from '../vfx/VFXManager';
import { EventBus } from '../core/EventBus';
import { EnemyState } from '../enemies/EnemyState';

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

  constructor(cameraController: CameraController) {
    this.cameraController = cameraController;
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

    // 3. Resolve combat interactions
    const hits = this.hitboxSystem.checkHits();
    for (const hit of hits) {
      const isPlayerHit = hit.hurtbox.id === 'PLAYER';
      
      if (isPlayerHit) {
        const oldHp = this.player['health']['currentHealth'];
        this.player.takeDamage(hit.hitbox.damage, hit.hitbox.direction, hit.hitbox.knockback);
        const newHp = this.player['health']['currentHealth'];
        
        EventBus.emit('playerHealth', { current: newHp, max: this.player['health']['maxHealth'], delta: newHp - oldHp });
        
        if (newHp <= 0) {
          EventBus.emit('playerDeath');
        } else {
          this.vfx.spawnHurt(hit.hitbox.position);
          this.cameraController.addShake(1.5);
        }
      } else {
        const targetEnemy = this.enemies.find(e => e.id === hit.hurtbox.id);
        if (targetEnemy) {
          const oldHp = targetEnemy.health['currentHealth'];
          targetEnemy.takeDamage(hit.hitbox.damage, hit.hitbox.direction, hit.hitbox.knockback);
          const newHp = targetEnemy.health['currentHealth'];
          
          EventBus.emit('enemyHealth', { current: newHp, max: targetEnemy.health['maxHealth'], delta: newHp - oldHp });
          
          if (newHp <= 0 && !this.isEncounterCompleted) {
             this.encounterActive = false;
             this.isEncounterCompleted = true;
             EventBus.emit('encounterComplete');
          }

          // Assuming damage > 15 is heavy hit for now
          const isHeavy = hit.hitbox.damage > 15; 
          this.vfx.spawnHit(hit.hitbox.position, hit.hitbox.direction, isHeavy);
          this.cameraController.addShake(isHeavy ? 1.0 : 0.5);
          this.hitStopTimer = isHeavy ? 0.07 : 0.04;
        }
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
    EventBus.emit('encounterComplete'); // Quick hack to hide enemy HP bar
  }
}
