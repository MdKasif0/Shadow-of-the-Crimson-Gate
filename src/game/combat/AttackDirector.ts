import * as THREE from 'three';
import { Enemy } from '../enemies/Enemy';

export enum AttackRole {
  PRIMARY_MELEE,
  FLANKER,
  SUPPORT,
  WAITING
}

export class AttackDirector {
  private maxMeleeSlots: number = 2;

  public update(dt: number, enemies: Enemy[], playerPos: THREE.Vector3): void {
    const meleeCandidates: Enemy[] = [];
    const flankCandidates: Enemy[] = [];
    const supports: Enemy[] = [];

    // 1. Categorize enemies by natural preference
    for (const enemy of enemies) {
      if (enemy.health.isDead) continue;
      
      if (enemy.enemyType === 'TENGU') {
        supports.push(enemy);
      } else if (enemy.enemyType === 'SHADOW_YOKAI') {
        flankCandidates.push(enemy);
      } else {
        meleeCandidates.push(enemy);
      }
    }

    // 2. Assign Roles and manage slots
    let usedMeleeSlots = 0;

    // Basic Yokai get priority for PRIMARY_MELEE
    for (const enemy of meleeCandidates) {
      if (usedMeleeSlots < this.maxMeleeSlots) {
        enemy.assignRole(AttackRole.PRIMARY_MELEE);
        usedMeleeSlots++;
      } else {
        enemy.assignRole(AttackRole.WAITING);
      }
    }

    // Shadow Yokai flank, but if melee slots are free, they can also engage directly
    for (const enemy of flankCandidates) {
      if (usedMeleeSlots < this.maxMeleeSlots) {
        // If there's an open direct slot, maybe they take it, but they prefer flanking
        // We can just always assign FLANKER unless there are no other melee enemies.
        enemy.assignRole(AttackRole.FLANKER);
        usedMeleeSlots++; // Counts against the pressure cap
      } else {
        enemy.assignRole(AttackRole.WAITING);
      }
    }

    // Tengu always act as support
    for (const enemy of supports) {
      enemy.assignRole(AttackRole.SUPPORT);
    }
  }
}
