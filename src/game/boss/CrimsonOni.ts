import * as THREE from 'three';
import { Boss } from './Boss';
import { BossState } from './BossState';
import { BossPhaseId, BossPhaseConfig, CRIMSON_ONI_PHASES, getPhaseForHealth } from './BossPhase';
import { BossAI } from './BossAI';
import { BossAttackSystem, BossAttackPhase } from './BossAttackSystem';
import { BossAnimator } from './BossAnimator';
import { BossFactory } from './BossFactory';
import { HealthComponent, HealthEventPayload } from '../combat/HealthComponent';
import { HitboxSystem } from '../combat/HitboxSystem';
import { CharacterRig } from '../characters/CharacterRig';
import { VFXManager } from '../vfx/VFXManager';
import { EventBus } from '../core/EventBus';

/**
 * CrimsonOni — The game's first major boss.
 * ~3.5–4.0 units tall, procedurally generated, with its own
 * state machine, phase system, AI, and attack framework.
 */
export class CrimsonOni implements Boss {
  public id: string = 'CRIMSON_ONI';
  public root: THREE.Group;
  public health: HealthComponent;
  public state: BossState = BossState.IDLE;
  public phase: BossPhaseId = BossPhaseId.PHASE_1;

  private rig: CharacterRig;
  private animator: BossAnimator;
  private ai: BossAI;
  private attackSystem: BossAttackSystem;
  private phaseConfig: BossPhaseConfig;

  private velocity: THREE.Vector3 = new THREE.Vector3();
  private stateTimer: number = 0;
  private isDeathVfxPlayed: boolean = false;
  private previousPhase: BossPhaseId = BossPhaseId.PHASE_1;

  // ─── Boss Stats ──────────────────────────────────────────────────────
  private static readonly MAX_HEALTH = 1000;
  private static readonly HURTBOX_RADIUS = 1.2;
  private static readonly HURTBOX_HEIGHT = 4.0;
  private static readonly COLLISION_RADIUS = 1.0;
  private static readonly HURT_DURATION = 0.3;
  private static readonly KNOCKBACK_RESISTANCE = 0.85; // Boss barely flinches

  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'CrimsonOni';

    // Build procedural geometry
    this.rig = BossFactory.createCrimsonOni();
    this.root.add(this.rig.root);

    // Systems
    this.animator = new BossAnimator(this.rig);
    this.ai = new BossAI();
    this.attackSystem = new BossAttackSystem();
    this.phaseConfig = CRIMSON_ONI_PHASES[0];

    // Health
    this.health = new HealthComponent(CrimsonOni.MAX_HEALTH);
    this.health.onDamage(this.onDamageTaken.bind(this));
    this.health.onDeath(this.onDeath.bind(this));
  }

  // ─── Public API ──────────────────────────────────────────────────────

  public takeDamage(amount: number, knockbackDir: THREE.Vector3, knockbackPower: number): void {
    if (this.health.isDead) return;
    if (this.attackSystem.isInvulnerable) return;

    // Apply reduced knockback
    const effectiveKnockback = knockbackPower * (1 - CrimsonOni.KNOCKBACK_RESISTANCE);
    this.velocity.copy(knockbackDir).multiplyScalar(effectiveKnockback);

    // Apply defense multiplier
    const mitigatedDamage = amount * (1 / this.phaseConfig.defenseMultiplier);
    this.health.takeDamage(mitigatedDamage, 'PLAYER');
  }

  public reset(position: THREE.Vector3): void {
    this.root.position.copy(position);
    this.health['currentHealth'] = CrimsonOni.MAX_HEALTH;
    this.health.isDead = false;
    this.velocity.set(0, 0, 0);
    this.isDeathVfxPlayed = false;
    this.state = BossState.IDLE;
    this.phase = BossPhaseId.PHASE_1;
    this.previousPhase = BossPhaseId.PHASE_1;
    this.phaseConfig = CRIMSON_ONI_PHASES[0];
    this.stateTimer = 0;
    this.attackSystem.reset();
    this.animator.setState(BossState.IDLE);
    this.root.rotation.set(0, 0, 0);
    this.root.scale.setScalar(1);
    this.root.visible = true;
  }

  // ─── Update Loop ─────────────────────────────────────────────────────

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    hitboxSystem: HitboxSystem,
    collisionSystem: any,
    vfx?: VFXManager
  ): void {
    this.stateTimer += dt;

    // Update animator
    this.animator.setAttackState(
      this.attackSystem.currentAttackId,
      this.attackSystem.currentPhase,
      this.attackSystem.attackProgress
    );
    this.animator.update(dt);

    // ─── DEFEATED ─────────────────────────────────────────────────
    if (this.state === BossState.DEFEATED) {
      if (!this.isDeathVfxPlayed && vfx) {
        vfx.spawnDeath(this.root.position);
        this.isDeathVfxPlayed = true;
      }
      this.applyVelocity(dt, collisionSystem);
      return;
    }

    // ─── PHASE TRANSITION ─────────────────────────────────────────
    if (this.state === BossState.PHASE_TRANSITION) {
      this.attackSystem.isInvulnerable = true;
      if (this.stateTimer > 2.0) {
        // Transition complete
        this.attackSystem.isInvulnerable = false;
        this.setState(this.phase === BossPhaseId.PHASE_3 ? BossState.ENRAGED : BossState.IDLE);
      }
      return;
    }

    // ─── Register hurtbox ─────────────────────────────────────────
    hitboxSystem.registerHurtbox({
      id: this.id,
      position: this.root.position.clone(),
      radius: CrimsonOni.HURTBOX_RADIUS,
      height: CrimsonOni.HURTBOX_HEIGHT,
    });

    // ─── HURT ─────────────────────────────────────────────────────
    if (this.state === BossState.HURT) {
      this.applyVelocity(dt, collisionSystem);
      if (this.stateTimer > CrimsonOni.HURT_DURATION) {
        this.setState(BossState.IDLE);
      }
      return;
    }

    // ─── ATTACK ───────────────────────────────────────────────────
    if (this.state === BossState.ATTACK) {
      const forward = new THREE.Vector3(0, 0, 1)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.root.rotation.y);

      this.attackSystem.update(dt, this.id, this.root.position, forward, hitboxSystem, this.phaseConfig);

      // Apply lunge velocity during active frames
      const lunge = this.attackSystem.getLungeVelocity(forward);
      if (lunge.lengthSq() > 0.01) {
        this.velocity.copy(lunge);
      }

      // Attack finished?
      if (!this.attackSystem.isAttacking) {
        this.setState(BossState.RECOVER);
      }

      this.applyVelocity(dt, collisionSystem);
      return;
    }

    // ─── RECOVER ──────────────────────────────────────────────────
    if (this.state === BossState.RECOVER) {
      this.applyVelocity(dt, collisionSystem);
      if (this.stateTimer > 0.5) {
        this.setState(BossState.IDLE);
      }
      return;
    }

    // ─── AI DECISION ──────────────────────────────────────────────
    const decision = this.ai.decide(
      this.root.position,
      playerPos,
      this.state,
      this.attackSystem.cooldown,
      this.phaseConfig,
      dt
    );

    if (decision.state !== this.state) {
      this.setState(decision.state);
    }

    // Start attack if AI decided to attack
    if (this.state === BossState.ATTACK && decision.attackId) {
      this.attackSystem.startAttack(decision.attackId);
    }

    // Movement
    if (this.state === BossState.APPROACH || this.state === BossState.ENRAGED) {
      this.velocity.copy(decision.moveDirection).multiplyScalar(this.phaseConfig.movementSpeed);
    } else {
      this.velocity.set(0, 0, 0);
    }

    // Facing — slow, deliberate rotation
    this.smoothRotateToward(decision.facingAngle, dt, 3.0);

    this.applyVelocity(dt, collisionSystem);
  }

  // ─── Private Methods ─────────────────────────────────────────────────

  private setState(newState: BossState): void {
    if (this.state === BossState.DEFEATED) return;
    this.state = newState;
    this.stateTimer = 0;
    this.animator.setState(newState);
  }

  private onDamageTaken(_event: HealthEventPayload): void {
    if (this.health.isDead) return;

    // Check for phase transition
    const hpPercent = this.health.currentHealth / this.health.maxHealth;
    const newPhaseConfig = getPhaseForHealth(hpPercent);

    if (newPhaseConfig.id !== this.previousPhase) {
      this.previousPhase = newPhaseConfig.id;
      this.phase = newPhaseConfig.id;
      this.phaseConfig = newPhaseConfig;
      this.attackSystem.reset();
      this.setState(BossState.PHASE_TRANSITION);
      this.attackSystem.isInvulnerable = true;

      EventBus.emit('bossPhaseTransition', { phase: this.phase, hpPercent });
      return;
    }

    // Only flinch if not currently attacking (boss has hyperarmor during attacks)
    if (this.state !== BossState.ATTACK && this.state !== BossState.PHASE_TRANSITION) {
      this.setState(BossState.HURT);
    }

    EventBus.emit('bossHealth', {
      current: this.health.currentHealth,
      max: this.health.maxHealth,
      phase: this.phase,
    });
  }

  private onDeath(_event: HealthEventPayload): void {
    this.setState(BossState.DEFEATED);
    EventBus.emit('bossDeath', { id: this.id });
  }

  private smoothRotateToward(targetAngle: number, dt: number, speed: number): void {
    let currentY = this.root.rotation.y;
    // Normalize
    while (currentY <= -Math.PI) currentY += Math.PI * 2;
    while (currentY > Math.PI) currentY -= Math.PI * 2;

    let diff = targetAngle - currentY;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    this.root.rotation.y = currentY + diff * dt * speed;
  }

  private applyVelocity(dt: number, collisionSystem: any): void {
    let damping = 8.0;
    if (this.state === BossState.HURT || this.state === BossState.DEFEATED) {
      damping = 4.0;
    }

    this.velocity.lerp(new THREE.Vector3(0, 0, 0), dt * damping);

    if (this.velocity.lengthSq() > 0.01) {
      const resolvedMove = collisionSystem.resolveMovement(
        this.root.position,
        this.velocity.clone().multiplyScalar(dt),
        CrimsonOni.COLLISION_RADIUS
      );
      this.root.position.add(resolvedMove);

      // Clamp to world bounds
      const bounds = { MIN_X: -28, MAX_X: 28, MIN_Z: -80, MAX_Z: 60 };
      this.root.position.x = THREE.MathUtils.clamp(this.root.position.x, bounds.MIN_X, bounds.MAX_X);
      this.root.position.z = THREE.MathUtils.clamp(this.root.position.z, bounds.MIN_Z, bounds.MAX_Z);
    }
  }
}
