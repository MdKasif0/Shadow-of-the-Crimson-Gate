/**
 * BossState — Dedicated state machine for boss entities.
 * Separate from EnemyState because bosses have fundamentally different behavior loops.
 */
export enum BossState {
  INTRO,
  IDLE,
  OBSERVE,
  APPROACH,
  ATTACK,
  RECOVER,
  HURT,
  PHASE_TRANSITION,
  ENRAGED,
  DEFEATED
}
