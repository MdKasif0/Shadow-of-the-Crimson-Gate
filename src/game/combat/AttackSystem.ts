import * as THREE from 'three';
import { ATTACK_DATA } from './AttackData';
import { PlayerState, CombatPhase } from './PlayerState';
import { HitboxSystem } from './HitboxSystem';
import { Katana } from './Katana';

/**
 * AttackSystem — Encapsulates hitbox registration and attack lunge
 * during the ACTIVE phase of a player attack.
 * Extracted from Ronin.update() for single-responsibility.
 */
export class AttackSystem {

  /**
   * Process the active phase of the current attack.
   * Registers hitboxes, resets attack memory, and returns the lunge movement vector.
   * Returns null if there is no active attack phase.
   */
  public static processActivePhase(
    state: PlayerState,
    attackTimer: number,
    dt: number,
    playerPosition: THREE.Vector3,
    currentRotation: number,
    katana: Katana,
    hitboxSystem: HitboxSystem
  ): THREE.Vector3 | null {
    if (state.combatPhase !== CombatPhase.ACTIVE || !state.currentAttackId) {
      return null;
    }

    const attackDef = ATTACK_DATA[state.currentAttackId];
    if (!attackDef) return null;

    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), currentRotation);

    // Reset hit memory on the very first frame of ACTIVE
    if (attackTimer <= dt) {
      hitboxSystem.resetAttackMemory('PLAYER');
    }

    // Register hitbox
    hitboxSystem.addActiveHitbox({
      ownerId: 'PLAYER',
      damage: attackDef.damage,
      position: playerPosition.clone(),
      direction: forward,
      range: katana.getRange(),
      hitAngle: katana.getHitAngle(),
      knockback: attackDef.id === 'ATTACK_3' ? 14 : 10
    });

    // Return lunge movement
    return forward.multiplyScalar(attackDef.lungeSpeed * dt);
  }
}
