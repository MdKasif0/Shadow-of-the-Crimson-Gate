import * as THREE from 'three';
import { BossState } from './BossState';
import { BossPhaseConfig } from './BossPhase';

/**
 * BossAI — Dedicated decision-making for boss entities.
 * Unlike EnemyAI, the boss does NOT use roles or leash systems.
 * Instead it has an observe→approach→attack→recover loop modulated by phase config.
 */

export interface BossAIDecision {
  state: BossState;
  moveDirection: THREE.Vector3;
  facingAngle: number;
  /** If state === ATTACK, which attack ID to use */
  attackId: string | null;
}

export class BossAI {
  private observeTimer: number = 0;
  private observeDuration: number = 1.0;

  /**
   * Decide what the boss should do this frame.
   */
  public decide(
    bossPos: THREE.Vector3,
    playerPos: THREE.Vector3,
    currentState: BossState,
    attackCooldown: number,
    phaseConfig: BossPhaseConfig,
    dt: number
  ): BossAIDecision {
    const toPlayer = playerPos.clone().sub(bossPos);
    toPlayer.y = 0;
    const distToPlayer = toPlayer.length();
    const dirToPlayer = distToPlayer > 0.001 ? toPlayer.normalize() : new THREE.Vector3(0, 0, 1);
    const facingAngle = Math.atan2(dirToPlayer.x, dirToPlayer.z);

    // States that lock out AI decisions
    if (
      currentState === BossState.DEFEATED ||
      currentState === BossState.HURT ||
      currentState === BossState.ATTACK ||
      currentState === BossState.RECOVER ||
      currentState === BossState.PHASE_TRANSITION ||
      currentState === BossState.INTRO
    ) {
      return { state: currentState, moveDirection: new THREE.Vector3(), facingAngle, attackId: null };
    }

    // OBSERVE: Pause and evaluate before acting
    if (currentState === BossState.OBSERVE) {
      this.observeTimer += dt;
      if (this.observeTimer >= this.observeDuration) {
        this.observeTimer = 0;
        // Transition to approach or attack
        if (distToPlayer <= this.getAttackRange(phaseConfig) && attackCooldown <= 0) {
          const attackId = this.selectAttack(phaseConfig);
          return { state: BossState.ATTACK, moveDirection: new THREE.Vector3(), facingAngle, attackId };
        }
        return { state: BossState.APPROACH, moveDirection: dirToPlayer, facingAngle, attackId: null };
      }
      return { state: BossState.OBSERVE, moveDirection: new THREE.Vector3(), facingAngle, attackId: null };
    }

    // IDLE: Start observing
    if (currentState === BossState.IDLE) {
      if (distToPlayer < 20) {
        this.observeTimer = 0;
        this.observeDuration = 0.5 + Math.random() * 1.0;
        return { state: BossState.OBSERVE, moveDirection: new THREE.Vector3(), facingAngle, attackId: null };
      }
      return { state: BossState.IDLE, moveDirection: new THREE.Vector3(), facingAngle, attackId: null };
    }

    // APPROACH: Close the distance
    if (currentState === BossState.APPROACH || currentState === BossState.ENRAGED) {
      const attackRange = this.getAttackRange(phaseConfig);

      if (distToPlayer <= attackRange && attackCooldown <= 0) {
        // Roll for attack based on aggression
        if (Math.random() < phaseConfig.aggression) {
          const attackId = this.selectAttack(phaseConfig);
          return { state: BossState.ATTACK, moveDirection: new THREE.Vector3(), facingAngle, attackId };
        }
      }

      if (distToPlayer > attackRange * 0.8) {
        return { state: currentState, moveDirection: dirToPlayer, facingAngle, attackId: null };
      }

      // Close enough, observe again
      this.observeTimer = 0;
      this.observeDuration = 0.3 + Math.random() * 0.5;
      return { state: BossState.OBSERVE, moveDirection: new THREE.Vector3(), facingAngle, attackId: null };
    }

    // Fallback
    return { state: BossState.IDLE, moveDirection: new THREE.Vector3(), facingAngle, attackId: null };
  }

  private getAttackRange(phaseConfig: BossPhaseConfig): number {
    // Boss has longer reach in later phases due to more aggressive lunges
    return 3.5 + (phaseConfig.aggression * 1.0);
  }

  private selectAttack(phaseConfig: BossPhaseConfig): string {
    const attacks = phaseConfig.attackSet;
    return attacks[Math.floor(Math.random() * attacks.length)];
  }
}
