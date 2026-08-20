import * as THREE from 'three';
import { EnemyState } from './EnemyState';

/**
 * EnemyAI — Reusable AI state machine for enemies.
 * Decides IDLE / WALK / ATTACK based on distance to player and cooldowns.
 * Extracted from BasicYokai.update() for reuse by future enemy types.
 */
export interface AIDecision {
  state: EnemyState;
  moveDirection: THREE.Vector3;
  facingAngle: number;
}

export class EnemyAI {
  public aggroRange: number;
  public attackRange: number;

  constructor(aggroRange: number = 12, attackRange: number = 2.5) {
    this.aggroRange = aggroRange;
    this.attackRange = attackRange;
  }

  /**
   * Decide what the enemy should do this frame.
   * Returns the desired state and movement info.
   */
  public decide(
    enemyPos: THREE.Vector3,
    playerPos: THREE.Vector3,
    attackCooldown: number,
    currentState: EnemyState
  ): AIDecision {
    const dir = playerPos.clone().sub(enemyPos).normalize();
    const distToPlayer = enemyPos.distanceTo(playerPos);
    const facingAngle = Math.atan2(dir.x, dir.z);

    // Dead or Hurt states are handled externally
    if (currentState === EnemyState.DEAD || currentState === EnemyState.HURT || currentState === EnemyState.ATTACK) {
      return { state: currentState, moveDirection: new THREE.Vector3(), facingAngle };
    }

    if (distToPlayer < this.aggroRange && distToPlayer > this.attackRange) {
      return { state: EnemyState.WALK, moveDirection: dir, facingAngle };
    }

    if (distToPlayer <= this.attackRange && attackCooldown <= 0) {
      return { state: EnemyState.ATTACK, moveDirection: new THREE.Vector3(), facingAngle };
    }

    // Idle — face player if in aggro range
    if (distToPlayer < this.aggroRange) {
      return { state: EnemyState.IDLE, moveDirection: new THREE.Vector3(), facingAngle };
    }

    return { state: EnemyState.IDLE, moveDirection: new THREE.Vector3(), facingAngle: 0 };
  }
}
