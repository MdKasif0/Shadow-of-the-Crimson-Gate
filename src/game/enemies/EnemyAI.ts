import * as THREE from 'three';
import { EnemyState } from './EnemyState';
import { EnemyConfig } from './EnemyConfig';
import { AttackRole } from '../combat/AttackDirector';

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
    dt: number,
    role: AttackRole = AttackRole.PRIMARY_MELEE,
    homePosition: THREE.Vector3 | null = null,
    leashRadius: number = 25
  ): AIDecision {
    // 1. Check Leash Boundary
    if (homePosition) {
      const distToHome = enemyPos.distanceTo(homePosition);
      if (currentState === EnemyState.LEASH) {
        if (distToHome < leashRadius * 0.5) {
          // Returned enough, resume normal logic
          return { state: EnemyState.IDLE, moveDirection: new THREE.Vector3(), facingAngle: 0 };
        } else {
          // Keep running home
          const toHome = homePosition.clone().sub(enemyPos);
          toHome.y = 0;
          const dirToHome = toHome.lengthSq() > 0.001 ? toHome.normalize() : new THREE.Vector3(0,0,1);
          return { state: EnemyState.LEASH, moveDirection: dirToHome, facingAngle: Math.atan2(dirToHome.x, dirToHome.z) };
        }
      } else if (distToHome > leashRadius) {
        // Trigger leash
        return { state: EnemyState.LEASH, moveDirection: new THREE.Vector3(), facingAngle: 0 };
      }
    }

    const toPlayer = playerPos.clone().sub(enemyPos);
    toPlayer.y = 0; // Flatten for horizontal AI logic
    const distToPlayer = toPlayer.length();
    const dirToPlayer = distToPlayer > 0.001 ? toPlayer.normalize() : new THREE.Vector3(0, 0, 1);
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

    // If it's a ranged enemy (has projectileSpeed) and outside preferred distance buffer
    if (this.config.projectileSpeed && distToPlayer > this.config.preferredDistance * 1.5) {
      return { state: EnemyState.MAINTAIN_DISTANCE, moveDirection: dirToPlayer, facingAngle };
    }

    // In combat zone — decide based on aggression and cooldown
    // In combat zone — decide based on aggression and cooldown
    const inAttackRange = distToPlayer <= this.config.attackRange;
    const canAttack = attackCooldown <= 0;

    if (role === AttackRole.WAITING) {
      // Keep distance, circle around
      if (distToPlayer < this.config.attackRange * 2) {
         const retreatDir = dirToPlayer.clone().negate();
         return { state: EnemyState.RETREAT, moveDirection: retreatDir, facingAngle };
      }
      this.strafeTimer += dt;
      if (this.strafeTimer > 2.0) {
        this.strafeDir *= -1;
        this.strafeTimer = 0;
      }
      return { state: EnemyState.STRAFE, moveDirection: this.computeStrafeDirection(dirToPlayer), facingAngle };
    }

    if (role === AttackRole.FLANKER) {
      // Try to get to the side of the player before engaging fully
      // But if close and can attack, just attack
      if (inAttackRange && canAttack && Math.random() < this.config.aggression) {
        return { state: EnemyState.ATTACK, moveDirection: new THREE.Vector3(), facingAngle };
      }
      
      // Compute flank position (offset by strafeDir)
      const flankDir = this.computeStrafeDirection(dirToPlayer).add(dirToPlayer).normalize();
      return { state: EnemyState.WALK, moveDirection: flankDir, facingAngle };
    }

    // Attack if in range, off cooldown, and aggression roll succeeds
    if (inAttackRange && canAttack) {
      const roll = Math.random();
      if (roll < this.config.aggression) {
        return { state: EnemyState.ATTACK, moveDirection: new THREE.Vector3(), facingAngle };
      }
    }

    // Too close? Retreat to preferred distance
    if (distToPlayer < this.config.preferredDistance * 0.8) {
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
