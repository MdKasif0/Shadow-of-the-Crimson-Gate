/**
 * BossPhase — Data-driven phase definitions for boss encounters.
 * Each phase defines how the boss behaves at a given HP threshold.
 */

export enum BossPhaseId {
  PHASE_1,
  PHASE_2,
  PHASE_3
}

export interface BossPhaseConfig {
  id: BossPhaseId;
  /** HP percentage at which this phase activates (1.0 = 100%) */
  healthThreshold: number;
  movementSpeed: number;
  attackCooldown: number;
  /** Attack IDs available in this phase */
  attackSet: string[];
  /** 0–1, higher = attacks more frequently */
  aggression: number;
  damageMultiplier: number;
  defenseMultiplier: number;
}

// ─── Crimson Oni Phase Configs ──────────────────────────────────────────────

export const CRIMSON_ONI_PHASES: BossPhaseConfig[] = [
  {
    id: BossPhaseId.PHASE_1,
    healthThreshold: 1.0,    // Active from 100% to 70%
    movementSpeed: 2.0,
    attackCooldown: 2.5,
    attackSet: ['HEAVY_SWING', 'DOUBLE_SWING', 'GROUND_SMASH', 'CHARGE_ATTACK'],
    aggression: 0.5,
    damageMultiplier: 1.0,
    defenseMultiplier: 1.0,
  },
  {
    id: BossPhaseId.PHASE_2,
    healthThreshold: 0.7,    // Active from 70% to 35%
    movementSpeed: 2.5,
    attackCooldown: 2.0,
    attackSet: ['HEAVY_SWING', 'DOUBLE_SWING', 'TRIPLE_SWING', 'SHOCKWAVE', 'LEAP_SMASH', 'CRIMSON_ARC'],
    aggression: 0.65,
    damageMultiplier: 1.2,
    defenseMultiplier: 0.9,
  },
  {
    id: BossPhaseId.PHASE_3,
    healthThreshold: 0.35,   // Active from 35% to 0%
    movementSpeed: 3.0,
    attackCooldown: 1.5,
    attackSet: ['TRIPLE_SWING', 'SHOCKWAVE', 'LEAP_SMASH', 'CRIMSON_ARC', 'BERSERKER_COMBO', 'CRIMSON_RAIN', 'GROUND_ERUPTION', 'FINAL_CHARGE'],
    aggression: 0.85,
    damageMultiplier: 1.5,
    defenseMultiplier: 0.8,
  },
];

/**
 * Returns the phase config that should be active at a given HP percentage.
 */
export function getPhaseForHealth(hpPercent: number): BossPhaseConfig {
  // Phases are ordered by threshold descending. Return the first whose threshold >= hpPercent.
  for (let i = CRIMSON_ONI_PHASES.length - 1; i >= 0; i--) {
    if (hpPercent <= CRIMSON_ONI_PHASES[i].healthThreshold) {
      return CRIMSON_ONI_PHASES[i];
    }
  }
  return CRIMSON_ONI_PHASES[0];
}
