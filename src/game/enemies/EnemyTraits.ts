import * as THREE from 'three';
import { EnemyConfig } from './EnemyConfig';
import { Posture } from '../combat/Posture';
import { CharacterRig } from '../characters/CharacterRig';
import { EventBus } from '../core/EventBus';

/**
 * EnemyTraits — What sets one enemy apart from another of the same kind: its
 * role in a fight, whether it's a chapter's elite, and its guard.
 *
 *   SHIELDED  blocks blows from the front until its guard breaks
 *   MINION    a weaker yokai, raised by a Shadow Caller
 *   SUMMONER  hangs back and raises minions, so it should be cut down first
 *   AMBUSHER  hides until the player walks past, then strikes from behind
 */
export type EnemyVariant = 'NORMAL' | 'SHIELDED' | 'MINION' | 'SUMMONER' | 'AMBUSHER';

export interface EnemyOptions {
  variant?: EnemyVariant;
  /** Makes this a chapter's elite, with a health bar of its own and a second phase. */
  eliteName?: string;
}

const ELITE_SCALE = 1.35;
const SUMMON_INTERVAL = 7;
const ENRAGED_SUMMON_INTERVAL = 9;
const MAX_MINIONS = 2;
const AMBUSH_RANGE = 5;

const VARIANT_NAMES: Partial<Record<EnemyVariant, string>> = {
  SHIELDED: 'Warded Yokai',
  MINION: 'Lesser Yokai',
  SUMMONER: 'Shadow Caller',
  AMBUSHER: 'Lurking Shade',
};

export class EnemyTraits {
  public readonly variant: EnemyVariant;
  public readonly isElite: boolean;
  public readonly displayName: string;
  public readonly posture: Posture;
  public isEnraged = false;
  public isHidden: boolean;

  /** Set by the wave that spawned this enemy, so summoned minions join the fight. */
  public onSummon: ((type: string, position: THREE.Vector3) => void) | null = null;
  public minionCount = 0;
  private summonTimer = SUMMON_INTERVAL * 0.5;

  constructor(baseName: string, public readonly config: EnemyConfig, options: EnemyOptions = {}) {
    this.variant = options.variant ?? 'NORMAL';
    this.isElite = !!options.eliteName;
    this.displayName = options.eliteName ?? VARIANT_NAMES[this.variant] ?? baseName;
    this.isHidden = this.variant === 'AMBUSHER';
    this.posture = new Posture(config.maxHealth * (this.isElite ? 0.4 : this.variant === 'SHIELDED' ? 0.75 : 0.6));
  }

  /** The archetype's numbers, adjusted for this enemy's role. */
  public static adjustConfig(config: EnemyConfig, options: EnemyOptions = {}): EnemyConfig {
    const c = { ...config };
    if (options.variant === 'MINION') {
      c.maxHealth *= 0.4;
      c.damage *= 0.6;
      c.movementSpeed *= 1.15;
      c.hurtboxRadius *= 0.8;
      c.hurtboxHeight *= 0.8;
    } else if (options.variant === 'SHIELDED') {
      c.maxHealth *= 1.3;
      c.movementSpeed *= 0.85;
      c.knockbackResistance = Math.max(c.knockbackResistance, 0.5);
    } else if (options.variant === 'SUMMONER') {
      c.maxHealth *= 0.9;
      c.preferredDistance = 7;
      c.aggression = 0.25;
    } else if (options.variant === 'AMBUSHER') {
      c.damage *= 1.3;
      c.aggression = 0.9;
    }
    if (options.eliteName) {
      c.maxHealth *= 4;
      c.damage *= 1.35;
      c.knockbackResistance = Math.max(c.knockbackResistance, 0.6);
      c.collisionRadius *= ELITE_SCALE;
      c.hurtboxRadius *= ELITE_SCALE;
      c.hurtboxHeight *= ELITE_SCALE;
      c.attackRange *= c.projectileSpeed ? 1 : 1.25;
    }
    return c;
  }

  /** Resizes the model and adds anything the role carries. */
  public dress(rig: CharacterRig): void {
    if (this.isElite) rig.root.scale.multiplyScalar(ELITE_SCALE);
    if (this.variant === 'MINION') rig.root.scale.multiplyScalar(0.8);
    if (this.variant === 'SHIELDED') rig.leftLowerArm.add(createShield());
  }

  /**
   * A shielded enemy turns aside blows from the front. `attackDirection` is the way
   * the attacker is facing. Returns the fraction of damage that gets through.
   */
  public shieldFactor(enemyRotationY: number, attackDirection: THREE.Vector3, isStaggered: boolean): number {
    if (this.variant !== 'SHIELDED' || isStaggered || this.posture.isBroken) return 1;
    const facing = new THREE.Vector3(Math.sin(enemyRotationY), 0, Math.cos(enemyRotationY));
    const facingAttacker = facing.dot(attackDirection.clone().setY(0).normalize()) < -0.35;
    return facingAttacker ? 0.15 : 1;
  }

  /** Called once, when an elite first drops to half health. */
  public enrage(id: string): void {
    if (this.isEnraged) return;
    this.isEnraged = true;
    EventBus.emit('eliteEnraged', { id, name: this.displayName });
  }

  /** Counts down to raising another minion. */
  public updateSummoning(dt: number, position: THREE.Vector3, facing: number): void {
    const canSummon = this.variant === 'SUMMONER' || (this.isElite && this.isEnraged && this.config.enemyType === 'SHADOW_YOKAI');
    if (!canSummon || !this.onSummon || this.minionCount >= MAX_MINIONS) return;

    this.summonTimer -= dt;
    if (this.summonTimer > 0) return;
    this.summonTimer = this.isElite ? ENRAGED_SUMMON_INTERVAL : SUMMON_INTERVAL;

    const side = Math.random() > 0.5 ? 1 : -1;
    const offset = new THREE.Vector3(Math.cos(facing) * 2.2 * side, 0, -Math.sin(facing) * 2.2 * side);
    this.minionCount++;
    this.onSummon('MINION', position.clone().add(offset));
  }

  /** An ambusher stays hidden until the player comes close, then appears behind them. */
  public tryAmbush(position: THREE.Vector3, playerPos: THREE.Vector3): THREE.Vector3 | null {
    if (!this.isHidden) return null;
    if (position.distanceTo(playerPos) > AMBUSH_RANGE) return null;
    this.isHidden = false;
    const away = playerPos.clone().sub(position).setY(0).normalize();
    return playerPos.clone().addScaledVector(away, 1.9);
  }

  public reset(): void {
    this.posture.reset();
    this.isEnraged = false;
    this.isHidden = this.variant === 'AMBUSHER';
    this.summonTimer = SUMMON_INTERVAL * 0.5;
    this.minionCount = 0;
  }
}

/** A round lacquered shield with a paper ward pasted across it. */
function createShield(): THREE.Group {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.75 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.45, metalness: 0.8 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xd8cfb4, roughness: 0.9, side: THREE.DoubleSide });
  const ink = new THREE.MeshStandardMaterial({ color: 0x8f171b, roughness: 0.8, side: THREE.DoubleSide });

  const board = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 20), wood);
  board.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.025, 6, 24), iron);
  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), iron);
  boss.position.z = 0.03;
  const ward = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.42), paper);
  ward.position.set(0.12, -0.05, 0.03);
  ward.rotation.z = 0.12;
  const seal = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), ink);
  seal.position.set(0.12, 0.05, 0.032);
  seal.rotation.z = 0.12;

  group.add(board, rim, boss, ward, seal);
  group.traverse(child => { child.castShadow = true; });
  // Strapped to the outside of the forearm, facing forward
  group.position.set(0.12, -0.2, 0.18);
  group.rotation.y = 0.35;
  return group;
}
