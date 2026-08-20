import * as THREE from 'three';
import { EnemyState } from './EnemyState';
import { EnemyConfig } from './EnemyConfig';

/**
 * EnemyAI — Config-driven reusable AI state machine.
 * Supports: detect, approach, strafe, attack, retreat, recover.
 */
export interface AIDecision {
  state: EnemyState;
  moveDirection: THREE.Vector3;
  facingAngle: number;
}

export class EnemyAI {
  private config: EnemyConfig;
  private strafeDir: number = 1; // 1 = clockwise, -1 = counter-clockwise
  private strafeTimer: number = 0;

  constructor(config: EnemyConfig) {
    this.config = config;
    // Randomize initial strafe direction
    this.strafeDir = Math.random() > 0.5 ? 1 : -1;
  }

  /**
   * Decide what the enemy should do this frame.
   */
  public decide(
    enemyPos: THREE.Vector3,
    playerPos: THREE.Vector3,
    attackCooldown: number,
    currentState: EnemyState,
    dt: number
  ): AIDecision {
    const toPlayer = playerPos.clone().sub(enemyPos);
    const distToPlayer = toPlayer.length();
    const dirToPlayer = toPlayer.normalize();
    const facingAngle = Math.atan2(dirToPlayer.x, dirToPlayer.z);

    // Dead, Hurt, or currently Attacking — don't change state
    if (currentState === EnemyState.DEAD || currentState === EnemyState.HURT || currentState === EnemyState.ATTACK) {
      return { state: currentState, moveDirection: new THREE.Vector3(), facingAngle };
    }

    // Out of detection range → idle (don't face player)
    if (distToPlayer >= this.config.detectionRange) {
      return { state: EnemyState.IDLE, moveDirection: new THREE.Vector3(), facingAngle: 0 };
    }

    // In detection range but far from attack range → approach
    if (distToPlayer > this.config.attackRange * 1.5) {
      return { state: EnemyState.WALK, moveDirection: dirToPlayer, facingAngle };
    }

    // In combat zone — decide based on aggression and cooldown
    const inAttackRange = distToPlayer <= this.config.attackRange;
    const canAttack = attackCooldown <= 0;

    // Attack if in range, off cooldown, and aggression roll succeeds
    if (inAttackRange && canAttack) {
      const roll = Math.random();
      if (roll < this.config.aggression) {
        return { state: EnemyState.ATTACK, moveDirection: new THREE.Vector3(), facingAngle };
      }
    }

    // Too close? Retreat to preferred distance
    if (distToPlayer < this.config.preferredDistance * 0.6) {
      const retreatDir = dirToPlayer.clone().negate();
      return { state: EnemyState.RETREAT, moveDirection: retreatDir, facingAngle };
    }

    // Strafe — lateral movement around player
    this.strafeTimer += dt;
    if (this.strafeTimer > 1.5 + Math.random() * 1.0) {
      this.strafeDir *= -1; // Reverse direction periodically
      this.strafeTimer = 0;
    }

    const strafeDir = this.computeStrafeDirection(dirToPlayer);
    return { state: EnemyState.STRAFE, moveDirection: strafeDir, facingAngle };
  }

  /**
   * Compute perpendicular strafe direction relative to the player.
   */
  private computeStrafeDirection(dirToPlayer: THREE.Vector3): THREE.Vector3 {
    // Cross product with UP gives perpendicular on the XZ plane
    const perp = new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x).normalize();
    return perp.multiplyScalar(this.strafeDir);
  }

  /** Randomize strafe direction (useful on reset) */
  public resetStrafe(): void {
    this.strafeDir = Math.random() > 0.5 ? 1 : -1;
    this.strafeTimer = 0;
  }
}
