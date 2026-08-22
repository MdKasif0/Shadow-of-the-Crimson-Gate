import * as THREE from 'three';
import { BossAttackConfig, BOSS_ATTACKS } from './BossAttackData';
import { BossPhaseConfig } from './BossPhase';
import { HitboxSystem } from '../combat/HitboxSystem';

/**
 * BossAttackSystem — Manages attack lifecycle (windup → active → recovery),
 * hitbox registration, and damage immunity windows.
 */

export enum BossAttackPhase {
  NONE,
  WINDUP,
  ACTIVE,
  RECOVERY
}

export class BossAttackSystem {
  private currentAttack: BossAttackConfig | null = null;
  private attackTimer: number = 0;
  private attackPhase: BossAttackPhase = BossAttackPhase.NONE;
  private cooldownTimer: number = 0;
  public attackHistory: string[] = [];

  /** True during PHASE_TRANSITION or INTRO — boss cannot take damage */
  public isInvulnerable: boolean = false;

  public get isAttacking(): boolean {
    return this.currentAttack !== null;
  }

  public get currentAttackId(): string | null {
    return this.currentAttack?.id ?? null;
  }

  public get currentPhase(): BossAttackPhase {
    return this.attackPhase;
  }

  public get attackProgress(): number {
    if (!this.currentAttack) return 0;
    switch (this.attackPhase) {
      case BossAttackPhase.WINDUP:
        return Math.min(1, this.attackTimer / this.currentAttack.windup);
      case BossAttackPhase.ACTIVE:
        return Math.min(1, (this.attackTimer - this.currentAttack.windup) / this.currentAttack.active);
      case BossAttackPhase.RECOVERY: {
        const recoveryStart = this.currentAttack.windup + this.currentAttack.active;
        return Math.min(1, (this.attackTimer - recoveryStart) / this.currentAttack.recovery);
      }
      default:
        return 0;
    }
  }

  public get cooldown(): number {
    return this.cooldownTimer;
  }

  /**
   * Begin an attack by ID.
   */
  public startAttack(attackId: string): boolean {
    const config = BOSS_ATTACKS.get(attackId);
    if (!config || this.isAttacking) return false;

    this.currentAttack = config;
    this.attackTimer = 0;
    this.attackPhase = BossAttackPhase.WINDUP;
    this.attackHistory.push(attackId);
    if (this.attackHistory.length > 5) this.attackHistory.shift();
    return true;
  }

  /**
   * Update attack lifecycle and register hitboxes during active frames.
   */
  public update(
    dt: number,
    bossId: string,
    bossPos: THREE.Vector3,
    bossForward: THREE.Vector3,
    hitboxSystem: HitboxSystem,
    phaseConfig: BossPhaseConfig
  ): void {
    // Cool down between attacks
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
    }

    if (!this.currentAttack) return;

    this.attackTimer += dt;
    const atk = this.currentAttack;
    const windupEnd = atk.windup;
    const activeEnd = windupEnd + atk.active;
    const totalDuration = activeEnd + atk.recovery;

    // Determine current phase
    if (this.attackTimer < windupEnd) {
      this.attackPhase = BossAttackPhase.WINDUP;
    } else if (this.attackTimer < activeEnd) {
      // Transition into active
      if (this.attackPhase === BossAttackPhase.WINDUP) {
        this.attackPhase = BossAttackPhase.ACTIVE;
        hitboxSystem.resetAttackMemory(bossId);
      }

      // Handle Multi-Hit resets
      if (atk.multiHit) {
        const activeTime = this.attackTimer - windupEnd;
        const prevActiveTime = (this.attackTimer - dt) - windupEnd;
        for (const hitTime of atk.multiHit) {
          if (prevActiveTime < hitTime && activeTime >= hitTime) {
            hitboxSystem.resetAttackMemory(bossId);
          }
        }
      }

      // Register hitbox every frame during active
      hitboxSystem.addActiveHitbox({
        ownerId: bossId,
        damage: atk.baseDamage * phaseConfig.damageMultiplier,
        position: bossPos.clone(),
        direction: bossForward.clone(),
        range: atk.range,
        hitAngle: atk.hitAngle,
        knockback: atk.knockback,
        hitboxType: atk.hitboxType // Pass through hitbox type to hitbox system
      } as any);
    } else if (this.attackTimer < totalDuration) {
      this.attackPhase = BossAttackPhase.RECOVERY;
    } else {
      // Attack finished
      this.cooldownTimer = atk.cooldown; // use attack-specific cooldown
      this.currentAttack = null;
      this.attackPhase = BossAttackPhase.NONE;
    }
  }

  /**
   * Get lunge velocity for the current attack phase.
   */
  public getLungeVelocity(bossForward: THREE.Vector3): THREE.Vector3 {
    if (!this.currentAttack || this.attackPhase !== BossAttackPhase.ACTIVE) {
      return new THREE.Vector3();
    }
    if (this.currentAttack.movement === 'STATIONARY') {
      return new THREE.Vector3();
    }
    
    // Spread the lunge distance over the active duration
    const speed = this.currentAttack.lungeDistance / this.currentAttack.active;
    return bossForward.clone().multiplyScalar(speed);
  }

  public reset(): void {
    this.currentAttack = null;
    this.attackTimer = 0;
    this.attackPhase = BossAttackPhase.NONE;
    this.cooldownTimer = 0;
    this.isInvulnerable = false;
  }
}
