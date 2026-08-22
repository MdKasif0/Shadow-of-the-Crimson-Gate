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
  ['TRIPLE_SWING', {
    id: 'TRIPLE_SWING',
    name: 'Triple Swing',
    windup: 0.6,
    active: 1.2,
    recovery: 1.5,
    baseDamage: 20,
    range: 3.5,
    knockback: 12,
    hitAngle: Math.PI * 0.9,
    lungeDistance: 1.2,
    cooldown: 5.0,
    telegraph: ['POSTURE', 'WEAPON_GLOW'],
    movement: 'STEP',
    priority: 8,
    hitboxType: 'ARC',
    multiHit: [0.1, 0.5, 0.9] // Three strikes
  }],
  ['SHOCKWAVE', {
    id: 'SHOCKWAVE',
    name: 'Shockwave',
    windup: 1.2,
    active: 0.2,
    recovery: 1.8,
    baseDamage: 40,
    range: 6.0,
    knockback: 30,
    hitAngle: Math.PI * 2,
    lungeDistance: 0,
    cooldown: 8.0,
    telegraph: ['GROUND_GLOW', 'SOUND', 'WEAPON_GLOW'],
    movement: 'STATIONARY',
    priority: 6,
    hitboxType: 'RADIAL'
  }],
  ['LEAP_SMASH', {
    id: 'LEAP_SMASH',
    name: 'Leap Smash',
    windup: 1.0,
    active: 0.5,
    recovery: 2.0,
    baseDamage: 45,
    range: 5.0, // Impact radius
    knockback: 35,
    hitAngle: Math.PI * 2,
    lungeDistance: 8.0, // Long gap closer
    cooldown: 10.0,
    telegraph: ['POSTURE', 'ROAR'],
    movement: 'CHARGE',
    priority: 10,
    hitboxType: 'RADIAL'
  }],
  ['CRIMSON_ARC', {
    id: 'CRIMSON_ARC',
    name: 'Crimson Arc',
    windup: 0.8,
    active: 0.2, // Time the projectile is spawned
    recovery: 1.0,
    baseDamage: 25,
    range: 15.0, // Ranged attack
    knockback: 10,
    hitAngle: 0,
    lungeDistance: 0,
    cooldown: 6.0,
    telegraph: ['WEAPON_GLOW', 'SOUND'],
    movement: 'STATIONARY',
    priority: 7,
    hitboxType: 'ARC' // Spawns projectile
  }],
  ['BERSERKER_COMBO', {
    id: 'BERSERKER_COMBO',
    name: 'Berserker Combo',
    windup: 0.5,
    active: 2.0,
    recovery: 2.5,
    baseDamage: 22,
    range: 3.5,
    knockback: 15,
    hitAngle: Math.PI,
    lungeDistance: 3.0,
    cooldown: 12.0,
    telegraph: ['ROAR', 'WEAPON_GLOW'],
    movement: 'STEP',
    priority: 9,
    hitboxType: 'ARC',
    multiHit: [0.1, 0.5, 0.9, 1.4, 1.8] // 5 erratic strikes
  }],
  ['CRIMSON_RAIN', {
    id: 'CRIMSON_RAIN',
    name: 'Crimson Rain',
    windup: 1.5,
    active: 0.5,
    recovery: 1.5,
    baseDamage: 35,
    range: 12.0,
    knockback: 10,
    hitAngle: 0,
    lungeDistance: 0,
    cooldown: 15.0,
    telegraph: ['POSTURE', 'GROUND_GLOW'],
    movement: 'STATIONARY',
    priority: 8,
    hitboxType: 'RADIAL' // Summons hazards
  }],
  ['GROUND_ERUPTION', {
    id: 'GROUND_ERUPTION',
    name: 'Ground Eruption',
    windup: 2.0,
    active: 0.5,
    recovery: 1.5,
    baseDamage: 50,
    range: 12.0,
    knockback: 40,
    hitAngle: 0,
    lungeDistance: 0,
    cooldown: 15.0,
    telegraph: ['ROAR', 'GROUND_GLOW', 'SOUND'],
    movement: 'STATIONARY',
    priority: 7,
    hitboxType: 'RADIAL' // Summons hazards
  }],
  ['FINAL_CHARGE', {
    id: 'FINAL_CHARGE',
    name: 'Final Charge',
    windup: 1.5,
    active: 1.0,
    recovery: 3.0,
    baseDamage: 60,
    range: 3.0, // Hitbox width
    knockback: 50,
    hitAngle: Math.PI * 0.5,
    lungeDistance: 15.0,
    cooldown: 18.0,
    telegraph: ['ROAR', 'POSTURE', 'SOUND'],
    movement: 'CHARGE',
    priority: 15,
    hitboxType: 'CONTINUOUS'
  }]
]);
