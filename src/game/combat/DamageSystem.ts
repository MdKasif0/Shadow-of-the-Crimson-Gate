import * as THREE from 'three';
import { HitboxSystem, HitEvent } from './HitboxSystem';
import { Ronin } from '../characters/Ronin';
import { Enemy } from '../enemies/Enemy';
import { EventBus } from '../core/EventBus';
import { VFXManager } from '../vfx/VFXManager';
import { CameraController } from '../camera/CameraController';
import { CrimsonOni } from '../boss/CrimsonOni';
import { DamageKind } from '../ui/DamageNumbers';
import { GUARD_BREAK_SECONDS } from './Posture';
import { Run } from '../meta/Run';

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

  /** Adds to an enemy's posture, breaking its guard when it fills. */
  public static addPosture(enemy: Enemy, amount: number): void {
    if (enemy.traits.posture.add(amount)) {
      enemy.breakGuard(GUARD_BREAK_SECONDS);
      EventBus.emit('guardBroken', { id: enemy.id, position: enemy.root.position.clone() });
      EventBus.emit('damageNumber', { position: enemy.root.position.clone().setY(2.6), text: 'GUARD BROKEN', kind: 'label' });
    }
    DamageSystem.emitEnemyHealth(enemy, 0);
  }

  public static emitEnemyHealth(enemy: Enemy, delta: number): void {
    EventBus.emit('enemyHealth', {
      id: enemy.id,
      current: enemy.health.currentHealth,
      max: enemy.health.maxHealth,
      delta,
      posture: enemy.traits.posture.fraction,
      isBroken: enemy.traits.posture.isBroken,
      isElite: enemy.traits.isElite,
      name: enemy.traits.displayName,
    });
  }

  public static emitDeath(enemy: Enemy): void {
    EventBus.emit('enemyDeath', {
      id: enemy.id,
      enemyType: enemy.enemyType,
      variant: enemy.traits.variant,
      isElite: enemy.traits.isElite,
      name: enemy.traits.displayName,
      position: enemy.root.position.clone(),
    });
  }

  private static showNumber(position: THREE.Vector3, amount: number, kind: DamageKind): void {
    EventBus.emit('damageNumber', { position: position.clone(), text: String(Math.round(amount)), kind });
  }

  public static resolveHits(
    hits: HitEvent[],
    player: Ronin,
    enemies: Enemy[],
    vfx: VFXManager,
    cameraController: CameraController,
    boss?: CrimsonOni | null
  ): { hitStopTime: number; result: DamageResult } {
    let hitStopTime = 0;
    const result: DamageResult = { playerDied: false, enemyKilled: null };

    for (const hit of hits) {
      const isPlayerAttack = hit.hitbox.ownerId.startsWith('PLAYER');

      if (hit.hurtbox.id === 'PLAYER') {
        if (isPlayerAttack) continue;
        if (player.tryPerfectDodge()) continue;

        const guard = hit.hitbox.unblockable ? null : player.tryGuard(hit.hitbox.direction);
        if (guard === 'parry') {
          EventBus.emit('parry', { attackerId: hit.hitbox.ownerId, position: player.root.position.clone() });
          hitStopTime = Math.max(hitStopTime, 0.09);
          continue;
        }

        const oldHp = player.health.currentHealth;
        if (guard === 'block') {
          player.takeBlockedDamage(Math.round(hit.hitbox.damage * (1 - player.modifiers.blockReduction)));
          vfx.spawnHit(player.root.position.clone().setY(1.3), hit.hitbox.direction.clone().negate(), false);
          cameraController.addShake(0.5);
          EventBus.emit('damageNumber', { position: player.root.position.clone(), text: 'BLOCKED', kind: 'label' });
        } else {
          player.takeDamage(hit.hitbox.damage, hit.hitbox.direction, hit.hitbox.knockback);
        }
        const newHp = player.health.currentHealth;
        if (newHp === oldHp) continue; // Blocked by invulnerability

        EventBus.emit('playerHealth', { current: newHp, max: player.health.maxHealth, delta: newHp - oldHp });
        DamageSystem.showNumber(player.root.position, oldHp - newHp, 'player');
        if (guard !== 'block') {
          player.glow.flash(0.8);
          cameraController.addImpactKick(hit.hitbox.direction, 0.35);
        }

        // A grab that lands holds the Ronin fast
        if (hit.hitbox.grab && guard !== 'block' && newHp > 0) {
          const grabber = enemies.find(e => e.id === hit.hitbox.ownerId) as (Enemy & { onGrabLanded?: () => void }) | undefined;
          grabber?.onGrabLanded?.();
        }

        if (newHp <= 0) {
          result.playerDied = true;
          EventBus.emit('playerDeath');
        } else if (guard !== 'block') {
          vfx.spawnHurt(player.root.position);
          cameraController.addShake(1.4);
          hitStopTime = Math.max(hitStopTime, 0.06);
        }
        continue;
      }

      // Enemies don't hurt each other
      if (!isPlayerAttack) continue;

      const target = enemies.find(e => e.id === hit.hurtbox.id) ?? (boss && hit.hurtbox.id === boss.id ? boss : null);
      if (!target) continue;

      const hitbox = hit.hitbox;
      const enemy = target !== boss ? target as Enemy : null;
      const wasStaggered = target.isStaggered;
      const shield = enemy ? enemy.traits.shieldFactor(enemy.root.rotation.y, hitbox.direction, wasStaggered) : 1;
      const isShielded = shield < 1;

      // Difficulty and New Game+ make enemies tougher by shrinking the damage they take
      let damage = hitbox.damage * shield / Run.enemyToughness;
      if (wasStaggered) damage *= STAGGER_DAMAGE_BONUS * player.modifiers.staggeredDamage;

      const oldHp = target.health.currentHealth;
      target.takeDamage(Math.round(damage), hitbox.direction, isShielded ? hitbox.knockback * 0.2 : hitbox.knockback, isShielded ? 0 : hitbox.stagger);
      const newHp = target.health.currentHealth;

      // Wearing down the guard: heavy blows, counters and blocked strikes all count for more
      const postureHit = hitbox.damage * (hitbox.posture ?? 0.6)
        * (hitbox.isCounter ? 1.6 : 1) * (isShielded ? 1.4 : 1)
        * ((hitbox.posture ?? 0) > 1 ? player.modifiers.postureDamage : 1);
      if (enemy && !enemy.health.isDead) {
        DamageSystem.addPosture(enemy, postureHit);
      } else if (boss && target === boss) {
        boss.applyPostureDamage(postureHit * 0.5);
      }
      if (isShielded) {
        EventBus.emit('damageNumber', { position: target.root.position.clone(), text: 'GUARDED', kind: 'label' });
      }
      if (hitbox.isCounter && newHp < oldHp) {
        EventBus.emit('damageNumber', { position: target.root.position.clone().setY(2.4), text: 'COUNTER', kind: 'label' });
      }
      if (newHp === oldHp) continue; // The boss can be untouchable while changing phase

      const isEnemy = target !== boss;
      const isKill = newHp <= 0;
      const isHeavy = hitbox.isHeavy ?? false;

      if (isEnemy) {
        DamageSystem.emitEnemyHealth(target as Enemy, newHp - oldHp);
        if (isKill) {
          result.enemyKilled = target.id;
          DamageSystem.emitDeath(target as Enemy);
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
      EventBus.emit('playerHitLanded', { position: hitPoint.clone(), direction: hitbox.direction.clone(), isHeavy, isKill });

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
