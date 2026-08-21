/**
 * BossAttackData — Data definitions for all boss attacks.
 * Timing values are in seconds. Damage/knockback are raw values
 * that get multiplied by the current phase's damageMultiplier.
 */

export interface BossAttackConfig {
  id: string;
  name: string;
  /** Windup telegraph time (seconds) */
  windup: number;
  /** Active hitbox time (seconds) */
  active: number;
  /** Recovery time before next action (seconds) */
  recovery: number;
  /** Base damage before phase multiplier */
  baseDamage: number;
  /** Hitbox range in world units */
  range: number;
  /** Knockback force applied to player */
  knockback: number;
  /** Hit cone angle in radians (Math.PI = 180°) */
  hitAngle: number;
  /** Forward lunge distance during active frames */
  lungeDistance: number;
}

// ─── Crimson Oni Attacks ────────────────────────────────────────────────────

export const BOSS_ATTACKS: Map<string, BossAttackConfig> = new Map([
  ['KANABO_SLAM', {
    id: 'KANABO_SLAM',
    name: 'Kanabo Slam',
    windup: 0.8,
    active: 0.25,
    recovery: 0.8,
    baseDamage: 30,
    range: 3.0,
    knockback: 25,
    hitAngle: Math.PI / 3,  // 60° frontal cone
    lungeDistance: 2.0,
  }],
  ['KANABO_SWEEP', {
    id: 'KANABO_SWEEP',
    name: 'Kanabo Sweep',
    windup: 0.6,
    active: 0.3,
    recovery: 0.6,
    baseDamage: 20,
    range: 3.5,
    knockback: 20,
    hitAngle: Math.PI * 0.8, // Wide 144° sweep
    lungeDistance: 1.0,
  }],
  ['STOMP', {
    id: 'STOMP',
    name: 'Ground Stomp',
    windup: 0.7,
    active: 0.15,
    recovery: 1.0,
    baseDamage: 25,
    range: 4.5,
    knockback: 30,
    hitAngle: Math.PI * 2,  // Full 360° AoE
    lungeDistance: 0,
  }],
]);
