/**
 * BossAttackData — Data definitions for all boss attacks.
 * Timing values are in seconds. Damage/knockback are raw values
 * that get multiplied by the current phase's damageMultiplier.
 */

export type TelegraphType = 'WEAPON_GLOW' | 'GROUND_GLOW' | 'SOUND' | 'POSTURE' | 'ROAR';
export type MovementType = 'STATIONARY' | 'STEP' | 'CHARGE';
export type HitboxType = 'ARC' | 'RADIAL' | 'CONTINUOUS';

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
  /** Hit cone angle in radians (Math.PI = 180°), used for ARC hitboxes */
  hitAngle: number;
  /** Forward lunge distance during active frames */
  lungeDistance: number;

  /** Minimum time before this attack can be used again */
  cooldown: number;
  /** Visual/Audio telegraph cues */
  telegraph: TelegraphType[];
  /** How the boss moves during the attack */
  movement: MovementType;
  /** Higher priority attacks are preferred if valid */
  priority: number;
  /** Shape of the hitbox (ARC, RADIAL, CONTINUOUS) */
  hitboxType: HitboxType;
  /** For multi-hit attacks (like DOUBLE_SWING), defining exact hit times relative to start of active phase */
  multiHit?: number[]; 
}

// ─── Crimson Oni Attacks ────────────────────────────────────────────────────

export const BOSS_ATTACKS: Map<string, BossAttackConfig> = new Map([
  ['HEAVY_SWING', {
    id: 'HEAVY_SWING',
    name: 'Heavy Swing',
    windup: 0.8,
    active: 0.25,
    recovery: 1.0,
    baseDamage: 25,
    range: 3.5,
    knockback: 15,
    hitAngle: Math.PI / 2, // 90° arc
    lungeDistance: 1.5,
    cooldown: 3.0,
    telegraph: ['POSTURE', 'WEAPON_GLOW'],
    movement: 'STEP',
    priority: 10,
    hitboxType: 'ARC'
  }],
  ['DOUBLE_SWING', {
    id: 'DOUBLE_SWING',
    name: 'Double Swing',
    windup: 0.6,
    active: 0.8, // total active time covering both swings
    recovery: 1.2,
    baseDamage: 18,
    range: 3.0,
    knockback: 10,
    hitAngle: Math.PI * 0.8, // 144° wide arc
    lungeDistance: 1.0,
    cooldown: 4.5,
    telegraph: ['POSTURE'],
    movement: 'STEP',
    priority: 8,
    hitboxType: 'ARC',
    multiHit: [0.1, 0.6] // hit 1 at 0.1s, hit 2 at 0.6s into active
  }],
  ['GROUND_SMASH', {
    id: 'GROUND_SMASH',
    name: 'Ground Smash',
    windup: 1.0,
    active: 0.2,
    recovery: 1.5,
    baseDamage: 30,
    range: 4.5, // radius of impact
    knockback: 25,
    hitAngle: Math.PI * 2, // 360 radial
    lungeDistance: 0,
    cooldown: 6.0,
    telegraph: ['WEAPON_GLOW', 'GROUND_GLOW', 'SOUND'],
    movement: 'STATIONARY',
    priority: 5,
    hitboxType: 'RADIAL'
  }],
  ['CHARGE_ATTACK', {
    id: 'CHARGE_ATTACK',
    name: 'Charge Attack',
    windup: 1.2,
    active: 1.0, // charges forward for 1 second
    recovery: 1.5,
    baseDamage: 35,
    range: 1.5, // width of the charge path
    knockback: 30,
    hitAngle: Math.PI / 2,
    lungeDistance: 12.0, // huge movement distance
    cooldown: 8.0,
    telegraph: ['POSTURE', 'SOUND'],
    movement: 'CHARGE',
    priority: 15, // High priority if far away
    hitboxType: 'CONTINUOUS'
  }]
]);
