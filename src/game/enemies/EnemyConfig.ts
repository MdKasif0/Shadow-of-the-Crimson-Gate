/**
 * EnemyConfig — Data-driven archetype definition for all enemy types.
 * Each enemy receives one of these configs to drive its stats and AI behavior.
 */
export interface EnemyConfig {
  enemyType: string;
  maxHealth: number;
  movementSpeed: number;
  detectionRange: number;
  attackRange: number;
  attackCooldownMin: number;
  attackCooldownMax: number;
  damage: number;
  knockback: number;
  knockbackResistance: number;  // 0 = full knockback, 1 = immune
  preferredDistance: number;     // ideal combat distance (used for strafe/retreat)
  aggression: number;           // 0-1, higher = attacks more, lower = strafes more
  attackWindup: number;
  attackActive: number;
  attackRecovery: number;
  hurtDuration: number;
  collisionRadius: number;
  hurtboxRadius: number;
  hurtboxHeight: number;
}

// ─── Presets ─────────────────────────────────────────────────────────────────

export const BASIC_YOKAI_CONFIG: EnemyConfig = {
  enemyType: 'BASIC_YOKAI',
  maxHealth: 100,
  movementSpeed: 2.5,
  detectionRange: 12,
  attackRange: 2.5,
  attackCooldownMin: 1.2,
  attackCooldownMax: 1.8,
  damage: 15,
  knockback: 15,
  knockbackResistance: 0,
  preferredDistance: 2.0,
  aggression: 0.9,
  attackWindup: 0.4,
  attackActive: 0.2,
  attackRecovery: 0.4,
  hurtDuration: 0.4,
  collisionRadius: 0.6,
  hurtboxRadius: 0.6,
  hurtboxHeight: 2.0,
};

export const SHADOW_YOKAI_CONFIG: EnemyConfig = {
  enemyType: 'SHADOW_YOKAI',
  maxHealth: 75,
  movementSpeed: 3.5,
  detectionRange: 14,
  attackRange: 2.0,
  attackCooldownMin: 1.0,
  attackCooldownMax: 1.4,
  damage: 18,
  knockback: 10,
  knockbackResistance: 0.2,
  preferredDistance: 3.5,
  aggression: 0.5,
  attackWindup: 0.25,
  attackActive: 0.15,
  attackRecovery: 0.35,
  hurtDuration: 0.3,
  collisionRadius: 0.5,
  hurtboxRadius: 0.5,
  hurtboxHeight: 2.4,
};
