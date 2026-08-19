import * as THREE from 'three';
import { Renderer } from './core/Renderer';
import { Clock } from './core/Clock';
import { InputManager } from './core/InputManager';
import { CameraController } from './camera/CameraController';
import { LightingSystem } from './lighting/LightingSystem';
import { AtmosphereSystem } from './atmosphere/AtmosphereSystem';
import { WorldGenerator } from './world/WorldGenerator';
import { CollisionSystem } from './physics/CollisionSystem';
import { Ronin } from './characters/Ronin';
import { Yokai } from './characters/Yokai';
import { CharacterAnimator } from './characters/CharacterAnimator';
import { CombatSystem } from './combat/CombatSystem';
import { DashSystem } from './combat/DashSystem';
import { HitboxSystem, HitboxData } from './combat/HitboxSystem';
import { HealthSystem } from './combat/HealthSystem';
import { EnemyAI } from './enemies/EnemyAI';
import { SlashVFX, HitVFX, DashVFX, DeathVFX } from './vfx/CombatVFX';
import { GameHUD } from './ui/GameHUD';
import { GAME_CONFIG } from './GameConfig';

export type GameState = 'loading' | 'playing' | 'paused' | 'playerDead';

export class ThreeGame {
  private renderer: Renderer;
  private clock: Clock;
  private input: InputManager;
  private camera: CameraController;
  private scene: THREE.Scene;
  private hud: GameHUD;

  // Systems
  private collision: CollisionSystem;
  private combat: CombatSystem;
  private dash: DashSystem;
  private hitbox: HitboxSystem;
  private playerHealth: HealthSystem;

  // Characters
  private ronin: Ronin;
  private roninAnimator: CharacterAnimator;
  private playerGroup: THREE.Group;

  // Enemy
  private yokai: Yokai;
  private yokaiAnimator: CharacterAnimator;
  private enemyAI: EnemyAI;
  private enemySpawnPos = new THREE.Vector3(8, 0, 5);

  // VFX
  private slashVFX: SlashVFX;
  private hitVFX: HitVFX;
  private dashVFX: DashVFX;
  private deathVFX: DeathVFX;

  // State
  private state: GameState = 'loading';
  private isRunning: boolean = false;
  private animFrameId: number = 0;
  private containerId: string;
  private activeHitbox: HitboxData | null = null;

  // Movement
  private moveDirection = new THREE.Vector3();
  private facingDirection = new THREE.Vector3(0, 0, -1);
  private dashTrailTimer = 0;

  constructor(containerId: string) {
    this.containerId = containerId;
    this.renderer = new Renderer(containerId);
    this.clock = new Clock();
    this.input = new InputManager();
    this.camera = new CameraController(containerId);
    this.scene = new THREE.Scene();
    this.hud = new GameHUD(containerId);
    this.collision = new CollisionSystem();
    this.combat = new CombatSystem();
    this.dash = new DashSystem();
    this.hitbox = new HitboxSystem();
    this.playerHealth = new HealthSystem(GAME_CONFIG.PLAYER.MAX_HP);

    // Lighting
    new LightingSystem(this.scene);

    // Atmosphere
    const atmosphere = new AtmosphereSystem(this.scene);
    (this as any)._atmosphere = atmosphere;

    // World
    new WorldGenerator(this.scene, this.collision);

    // Player
    this.ronin = new Ronin();
    this.playerGroup = this.ronin.rig.group;
    this.playerGroup.position.set(0, 0, 5);
    this.scene.add(this.playerGroup);
    this.roninAnimator = new CharacterAnimator(this.ronin.rig);
    this.camera.setTarget(this.playerGroup);

    // Player fill light
    const playerLight = new THREE.PointLight(0x6688bb, 0.8, 6);
    playerLight.position.set(0, 2, 0.5);
    this.playerGroup.add(playerLight);

    // Enemy
    this.yokai = new Yokai();
    this.yokai.rig.group.position.copy(this.enemySpawnPos);
    this.scene.add(this.yokai.rig.group);
    this.yokaiAnimator = new CharacterAnimator(this.yokai.rig);
    this.enemyAI = new EnemyAI(this.yokai.rig.group, this.yokaiAnimator);

    // VFX
    this.slashVFX = new SlashVFX(this.scene);
    this.hitVFX = new HitVFX(this.scene);
    this.dashVFX = new DashVFX(this.scene);
    this.deathVFX = new DeathVFX(this.scene);

    // Bind
    this.loop = this.loop.bind(this);
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);

    // Start
    this.state = 'playing';
    this.isRunning = true;
    this.clock.start();
    this.loop();
  }

  private loop(): void {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.loop);

    const dt = this.clock.update();
    this.input.beginFrame();

    // Pause toggle
    if (this.input.isPressed('Escape')) {
      if (this.state === 'playing') { this.state = 'paused'; this.hud.showPause(true); }
      else if (this.state === 'paused') { this.state = 'playing'; this.hud.showPause(false); }
      this.input.keys['Escape'] = false; // consume
    }

    // Reset
    if (this.input.isPressed('KeyR')) {
      this.resetGame();
      this.input.keys['KeyR'] = false;
    }

    if (this.state === 'playing') {
      this.updatePlaying(dt);
    }

    // Always render & update VFX
    this.slashVFX.update(dt);
    this.hitVFX.update(dt);
    this.dashVFX.update(dt);
    this.deathVFX.update(dt);
    ((this as any)._atmosphere as AtmosphereSystem).update(dt);

    this.camera.update(dt);
    this.renderer.render(this.scene, this.camera.camera);
    this.input.endFrame();
    this.updateHUD(dt);
  }

  private updatePlaying(dt: number): void {
    // ─── Player Movement ───────────────────────────
    this.moveDirection.set(0, 0, 0);
    if (!this.combat.isAttacking && !this.dash.isDashing && !this.playerHealth.isDead) {
      if (this.input.isPressed('KeyW') || this.input.isPressed('ArrowUp')) this.moveDirection.z -= 1;
      if (this.input.isPressed('KeyS') || this.input.isPressed('ArrowDown')) this.moveDirection.z += 1;
      if (this.input.isPressed('KeyA') || this.input.isPressed('ArrowLeft')) this.moveDirection.x -= 1;
      if (this.input.isPressed('KeyD') || this.input.isPressed('ArrowRight')) this.moveDirection.x += 1;

      if (this.moveDirection.lengthSq() > 0) {
        this.moveDirection.normalize();
        this.facingDirection.copy(this.moveDirection);
        const speed = GAME_CONFIG.PLAYER.SPEED;
        const targetPos = this.playerGroup.position.clone().add(
          this.moveDirection.clone().multiplyScalar(speed * dt)
        );
        if (this.collision.canMoveTo(targetPos, GAME_CONFIG.PLAYER.RADIUS)) {
          this.playerGroup.position.copy(targetPos);
        } else {
          // Slide logic
          const slideX = this.playerGroup.position.clone();
          slideX.x += this.moveDirection.x * speed * dt;
          const slideZ = this.playerGroup.position.clone();
          slideZ.z += this.moveDirection.z * speed * dt;
          if (this.collision.canMoveTo(slideX, GAME_CONFIG.PLAYER.RADIUS)) {
            this.playerGroup.position.copy(slideX);
          } else if (this.collision.canMoveTo(slideZ, GAME_CONFIG.PLAYER.RADIUS)) {
            this.playerGroup.position.copy(slideZ);
          }
        }

        // Rotate
        const targetAngle = Math.atan2(this.facingDirection.x, this.facingDirection.z);
        const targetQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle);
        this.playerGroup.quaternion.slerp(targetQ, GAME_CONFIG.PLAYER.ROTATION_SPEED * dt);
      }
    }

    // ─── Dash ────────────────────────────────────
    if (this.input.isPressed('Space') && !this.dash.isDashing && !this.combat.isAttacking && !this.playerHealth.isDead) {
      if (this.dash.tryDash(this.facingDirection, this.moveDirection)) {
        this.input.keys['Space'] = false;
      }
    }
    this.dash.update(dt);
    if (this.dash.isDashing) {
      const vel = this.dash.getDashVelocity();
      const targetPos = this.playerGroup.position.clone().add(vel.multiplyScalar(dt));
      if (this.collision.canMoveTo(targetPos, GAME_CONFIG.PLAYER.RADIUS)) {
        this.playerGroup.position.copy(targetPos);
      }
      this.dashTrailTimer += dt;
      if (this.dashTrailTimer > 0.03) {
        this.dashVFX.spawn(this.playerGroup.position);
        this.dashTrailTimer = 0;
      }
    }

    // ─── Attack ──────────────────────────────────
    if (this.input.isAttackPressed() && !this.dash.isDashing && !this.playerHealth.isDead) {
      if (this.combat.tryAttack()) {
        // Spawn slash VFX
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.playerGroup.quaternion);
        this.slashVFX.spawn(this.playerGroup.position, dir, this.combat.comboIndex);
      }
    }
    this.combat.update(dt);

    // Active hitbox during attack active phase
    if (this.combat.phase === 'active' && !this.activeHitbox) {
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.playerGroup.quaternion);
      const hbPos = this.playerGroup.position.clone().add(dir.multiplyScalar(1.2));
      this.activeHitbox = this.hitbox.createHitbox('player', hbPos, GAME_CONFIG.PLAYER.ATTACK.HITBOX_RANGE, this.combat.getCurrentDamage());
    }
    if (this.combat.phase !== 'active' && this.activeHitbox) {
      this.hitbox.removeHitbox(this.activeHitbox.id);
      this.activeHitbox = null;
    }

    // ─── Enemy ───────────────────────────────────
    this.enemyAI.update(dt, this.playerGroup.position);

    // Check player attack hitting enemy
    if (this.activeHitbox && this.enemyAI.state !== 'dead') {
      const hit = this.hitbox.checkHit('enemy', this.yokai.rig.group.position, 0.6);
      if (hit) {
        this.enemyAI.takeDamage(hit.damage);
        this.hitVFX.spawn(this.yokai.rig.group.position);
        this.camera.shake(0.15);
        if (this.enemyAI.health.isDead) {
          this.deathVFX.spawn(this.yokai.rig.group.position);
          // Hide enemy after death animation
          setTimeout(() => { this.yokai.rig.group.visible = false; }, 1500);
        }
      }
    }

    // Check enemy attacking player
    if (this.enemyAI.attackHitboxActive && !this.dash.isInvulnerable && !this.playerHealth.isDead) {
      const dist = this.playerGroup.position.distanceTo(this.yokai.rig.group.position);
      if (dist < GAME_CONFIG.ENEMY.YOKAI.ATTACK_RANGE + 0.5) {
        this.playerHealth.takeDamage(GAME_CONFIG.ENEMY.YOKAI.ATTACK_DAMAGE);
        this.camera.shake(0.2);
        this.hitVFX.spawn(this.playerGroup.position);
        if (this.playerHealth.isDead) {
          this.state = 'playerDead';
          this.hud.showDeath(true);
        }
      }
    }

    // ─── Animation ───────────────────────────────
    const isMoving = this.moveDirection.lengthSq() > 0 && !this.combat.isAttacking && !this.dash.isDashing;
    if (this.playerHealth.isDead) {
      this.roninAnimator.setState('death');
    } else if (this.dash.isDashing) {
      this.roninAnimator.setState('dash');
    } else if (this.combat.isAttacking) {
      this.roninAnimator.setState(this.combat.getAnimState() as any);
    } else if (isMoving) {
      this.roninAnimator.setState('walk');
    } else {
      this.roninAnimator.setState('idle');
    }
    this.roninAnimator.update(dt, isMoving);
  }

  private updateHUD(_dt: number): void {
    this.hud.updatePlayerHP(this.playerHealth.getPercent());

    const enemyAlive = this.enemyAI.state !== 'dead' && this.yokai.rig.group.visible;
    this.hud.updateEnemyHP(
      this.enemyAI.health.getPercent(),
      enemyAlive && this.enemyAI.state !== 'idle'
    );

    if (GAME_CONFIG.DEBUG_MODE) {
      const p = this.playerGroup.position;
      const fps = Math.round(1 / Math.max(this.clock.getDelta(), 0.001));
      this.hud.updateDebug(`
        FPS: ${fps}<br/>
        Pos: (${p.x.toFixed(1)}, ${p.z.toFixed(1)})<br/>
        State: ${this.state}<br/>
        Combat: ${this.combat.phase} [${this.combat.comboIndex}]<br/>
        Dash: ${this.dash.isDashing ? 'YES' : 'no'}<br/>
        HP: ${this.playerHealth.hp}/${this.playerHealth.maxHp}<br/>
        Enemy: ${this.enemyAI.state} (${this.enemyAI.health.hp}hp)
      `);
    }
  }

  private resetGame(): void {
    this.playerGroup.position.set(0, 0, 5);
    this.playerGroup.quaternion.identity();
    this.playerHealth.reset();
    this.combat.reset();
    this.dash.reset();
    this.hitbox.clear();
    this.activeHitbox = null;
    this.enemyAI.reset(this.enemySpawnPos);
    this.state = 'playing';
    this.hud.showDeath(false);
    this.hud.showPause(false);
    this.roninAnimator.setState('idle');
  }

  private onResize(): void {
    this.renderer.resize();
    this.camera.resize();
  }

  public destroy(): void {
    this.isRunning = false;
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
    this.input.dispose();
    this.hud.destroy();
    this.renderer.destroy();
  }
}

export function init3DGame(containerId: string): ThreeGame {
  return new ThreeGame(containerId);
}
