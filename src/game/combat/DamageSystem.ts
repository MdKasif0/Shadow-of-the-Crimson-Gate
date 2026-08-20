import * as THREE from 'three';
import { HitboxSystem, HitEvent } from './HitboxSystem';
import { Ronin } from '../characters/Ronin';
import { Enemy } from '../enemies/Enemy';
import { EventBus } from '../core/EventBus';
import { VFXManager } from '../vfx/VFXManager';
import { CameraController } from '../camera/CameraController';

export interface DamageResult {
  playerDied: boolean;
  enemyKilled: string | null; // id of killed enemy, or null
}

/**
 * DamageSystem — Resolves hitbox/hurtbox intersections and applies damage.
 * Extracted from GameScene.update() for single-responsibility.
 */
export class DamageSystem {

  public static resolveHits(
    hits: HitEvent[],
    player: Ronin,
    enemies: Enemy[],
    vfx: VFXManager,
    cameraController: CameraController
  ): { hitStopTime: number; result: DamageResult } {
    let hitStopTime = 0;
    const result: DamageResult = { playerDied: false, enemyKilled: null };

    for (const hit of hits) {
      const isPlayerHit = hit.hurtbox.id === 'PLAYER';

      if (isPlayerHit) {
        const oldHp = player['health']['currentHealth'];
        player.takeDamage(hit.hitbox.damage, hit.hitbox.direction, hit.hitbox.knockback);
        const newHp = player['health']['currentHealth'];

        EventBus.emit('playerHealth', {
          current: newHp,
          max: player['health']['maxHealth'],
          delta: newHp - oldHp
        });

        if (newHp <= 0) {
          result.playerDied = true;
          EventBus.emit('playerDeath');
        } else {
          vfx.spawnHurt(hit.hitbox.position);
          cameraController.addShake(1.5);
        }
      } else {
        const targetEnemy = enemies.find(e => e.id === hit.hurtbox.id);
        if (targetEnemy) {
          const oldHp = targetEnemy.health['currentHealth'];
          targetEnemy.takeDamage(hit.hitbox.damage, hit.hitbox.direction, hit.hitbox.knockback);
          const newHp = targetEnemy.health['currentHealth'];

          EventBus.emit('enemyHealth', {
            current: newHp,
            max: targetEnemy.health['maxHealth'],
            delta: newHp - oldHp
          });

          if (newHp <= 0) {
            result.enemyKilled = targetEnemy.id;
          }

          const isHeavy = hit.hitbox.damage > 15;
          vfx.spawnHit(hit.hitbox.position, hit.hitbox.direction, isHeavy);
          cameraController.addShake(isHeavy ? 1.0 : 0.5);
          hitStopTime = Math.max(hitStopTime, isHeavy ? 0.07 : 0.04);
        }
      }
    }

    return { hitStopTime, result };
  }
}
