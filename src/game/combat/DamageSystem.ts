import * as THREE from 'three';
import { HitboxSystem, HitEvent } from './HitboxSystem';
import { Ronin } from '../characters/Ronin';
import { Enemy } from '../enemies/Enemy';
import { EventBus } from '../core/EventBus';
import { VFXManager } from '../vfx/VFXManager';
import { CameraController } from '../camera/CameraController';
import { Boss } from '../boss/Boss';
import { DamageKind } from '../ui/DamageNumbers';

/** Hitting a stunned enemy rewards the player for setting it up. */
const STAGGER_DAMAGE_BONUS = 1.5;
const STAGGER_LABEL_SECONDS = 1;

export interface DamageResult {
  playerDied: boolean;
  enemyKilled: string | null; // id of killed enemy, or null
}

/**
 * DamageSystem — Resolves hitbox/hurtbox intersections and applies damage.
 * Extracted from GameScene.update() for single-responsibility.
 */
export class DamageSystem {

  private static showNumber(position: THREE.Vector3, amount: number, kind: DamageKind): void {
    EventBus.emit('damageNumber', { position: position.clone(), text: String(Math.round(amount)), kind });
  }

  public static resolveHits(
    hits: HitEvent[],
    player: Ronin,
    enemies: Enemy[],
    vfx: VFXManager,
    cameraController: CameraController,
    boss?: Boss | null
  ): { hitStopTime: number; result: DamageResult } {
    let hitStopTime = 0;
    const result: DamageResult = { playerDied: false, enemyKilled: null };

    for (const hit of hits) {
      if (hit.hurtbox.id === 'PLAYER') {
        if (player.tryPerfectDodge()) continue;

        const oldHp = player.health.currentHealth;
        player.takeDamage(hit.hitbox.damage, hit.hitbox.direction, hit.hitbox.knockback);
        const newHp = player.health.currentHealth;
        if (newHp === oldHp) continue; // Blocked by invulnerability

        EventBus.emit('playerHealth', { current: newHp, max: player.health.maxHealth, delta: newHp - oldHp });
        DamageSystem.showNumber(player.root.position, oldHp - newHp, 'player');
        player.glow.flash(0.8);
        cameraController.addImpactKick(hit.hitbox.direction, 0.35);

        if (newHp <= 0) {
          result.playerDied = true;
          EventBus.emit('playerDeath');
        } else {
          vfx.spawnHurt(player.root.position);
          cameraController.addShake(1.4);
          hitStopTime = Math.max(hitStopTime, 0.06);
        }
        continue;
      }

      const target = enemies.find(e => e.id === hit.hurtbox.id) ?? (boss && hit.hurtbox.id === boss.id ? boss : null);
      if (!target) continue;

      const hitbox = hit.hitbox;
      const wasStaggered = target.isStaggered;
      const damage = wasStaggered ? Math.round(hitbox.damage * STAGGER_DAMAGE_BONUS) : hitbox.damage;

      const oldHp = target.health.currentHealth;
      target.takeDamage(damage, hitbox.direction, hitbox.knockback, hitbox.stagger);
      const newHp = target.health.currentHealth;
      if (newHp === oldHp) continue; // The boss can be untouchable while changing phase

      const isEnemy = target !== boss;
      const isKill = newHp <= 0;
      const isHeavy = hitbox.isHeavy ?? false;

      if (isEnemy) {
        EventBus.emit('enemyHealth', {
          current: newHp,
          max: target.health.maxHealth,
          delta: newHp - oldHp,
          name: (target as Enemy).enemyType.replace('_', ' '),
        });
        if (isKill) {
          result.enemyKilled = target.id;
          EventBus.emit('enemyDeath', { enemyType: (target as Enemy).enemyType, position: target.root.position.clone() });
        } else if ((hitbox.stagger ?? 0) >= STAGGER_LABEL_SECONDS) {
          EventBus.emit('damageNumber', { position: target.root.position.clone(), text: 'STAGGERED', kind: 'label' });
        }
      }

      player.addFocus(hitbox.focusGain ?? 0);
      target.glow.flash(isHeavy ? 1.2 : 0.75);
      DamageSystem.showNumber(target.root.position, oldHp - newHp, wasStaggered ? 'critical' : isHeavy ? 'heavy' : 'normal');

      // Sparks from where the blade met the target, not from the player's feet
      const hitPoint = hit.hurtbox.position.clone().addScaledVector(hitbox.direction, -hit.hurtbox.radius * 0.7);
      vfx.spawnHit(hitPoint, hitbox.direction, isHeavy);

      const weight = isEnemy ? 1 : 1.25;
      cameraController.addShake((hitbox.shake ?? 0.5) * weight);
      cameraController.addImpactKick(hitbox.direction, (hitbox.shake ?? 0.5) * 0.14);

      // A killing blow lands harder than the rest
      const stop = (hitbox.hitStop ?? 0.05) * (isKill ? 1.8 : 1);
      hitStopTime = Math.max(hitStopTime, stop);
    }

    return { hitStopTime, result };
  }
}
