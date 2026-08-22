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

import { BossAttackSystem } from './BossAttackSystem';
import { BOSS_ATTACKS, BossAttackConfig } from './BossAttackData';

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
    attackSystem: BossAttackSystem,
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
        if (attackSystem.cooldown <= 0) {
          const attackId = this.selectAttack(phaseConfig, distToPlayer, attackSystem.attackHistory);
          if (attackId) {
            return { state: BossState.ATTACK, moveDirection: new THREE.Vector3(), facingAngle, attackId };
          }
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
      if (attackSystem.cooldown <= 0) {
        const attackId = this.selectAttack(phaseConfig, distToPlayer, attackSystem.attackHistory);
        if (attackId && Math.random() < phaseConfig.aggression) {
          return { state: BossState.ATTACK, moveDirection: new THREE.Vector3(), facingAngle, attackId };
        }
      }

      const attackRange = this.getAttackRange(phaseConfig);
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
    return 3.5 + (phaseConfig.aggression * 1.0);
  }

  private selectAttack(phaseConfig: BossPhaseConfig, distToPlayer: number, history: string[]): string | null {
    const validAttacks: BossAttackConfig[] = [];
    
    for (const attackId of phaseConfig.attackSet) {
      const config = BOSS_ATTACKS.get(attackId);
      if (!config) continue;
      
      // Effective range includes lunge distance for gap closers
      const effectiveRange = config.range + config.lungeDistance;
      
      // If player is too far, only allow gap-closers or ranged attacks
      if (distToPlayer > effectiveRange + 0.5) continue;
      
      // Do not repeat same attack more than twice consecutively
      if (history.length >= 2 && history[history.length - 1] === attackId && history[history.length - 2] === attackId) {
        continue;
      }
      
      // Avoid spamming ultimate moves consecutively
      if (config.cooldown > 10.0 && history[history.length - 1] === attackId) {
        continue;
      }

      // If player is far, favor gap closers (boost priority)
      let dynamicPriority = config.priority;
      if (distToPlayer > 5.0 && config.lungeDistance > 0) {
        dynamicPriority += 5;
      }

      validAttacks.push({ ...config, priority: dynamicPriority });
    }
    
    if (validAttacks.length === 0) return null;
    
    // Sort by priority (highest first)
    validAttacks.sort((a, b) => b.priority - a.priority);
    
    // Pick from highest priority (or random among top priorities if we want variation)
    const topChoices = validAttacks.slice(0, 2);
    return topChoices[Math.floor(Math.random() * topChoices.length)].id;
  }
}
