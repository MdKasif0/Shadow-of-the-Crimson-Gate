export interface AttackDefinition {
  id: string;
  damage: number;
  windup: number;
  active: number;
  recovery: number;
  lungeSpeed: number;
  nextAttackId?: string; // which attack combos from this one

  /** Multiplies the katana's reach. Defaults to 1. */
  rangeScale?: number;
  /** Hits all around the player rather than in a forward cone. */
  isRadial?: boolean;
  knockback?: number;
  /** Seconds this attack stuns a regular enemy for. */
  stagger?: number;
  /** Focus gained for each enemy hit. */
  focusGain?: number;
  /** Freeze-frame length on hit, in seconds. */
  hitStop?: number;
  /** Screen shake strength on hit. */
  shake?: number;
  /** Which slash effect to play. */
  slashType: number;
}

export const ATTACK_DATA: Record<string, AttackDefinition> = {
  'ATTACK_1': {
    id: 'ATTACK_1',
    damage: 20,
    windup: 0.12,
    active: 0.14,
    recovery: 0.25,
    lungeSpeed: 8,
    nextAttackId: 'ATTACK_2',
    focusGain: 5,
    hitStop: 0.035,
    shake: 0.35,
    slashType: 1,
  },
  'ATTACK_2': {
    id: 'ATTACK_2',
    damage: 24,
    windup: 0.11,
    active: 0.15,
    recovery: 0.27,
    lungeSpeed: 10,
    nextAttackId: 'ATTACK_3',
    focusGain: 6,
    hitStop: 0.045,
    shake: 0.5,
    slashType: 2,
  },
  'ATTACK_3': {
    id: 'ATTACK_3',
    damage: 35,
    windup: 0.15,
    active: 0.18,
    recovery: 0.35,
    lungeSpeed: 15,
    nextAttackId: undefined, // End of combo
    stagger: 0.35,
    focusGain: 9,
    hitStop: 0.08,
    shake: 0.9,
    slashType: 3,
  },
  // Slow and committed, but it breaks an enemy's guard
  'ATTACK_HEAVY': {
    id: 'ATTACK_HEAVY',
    damage: 52,
    windup: 0.38,
    active: 0.18,
    recovery: 0.5,
    lungeSpeed: 16,
    rangeScale: 1.25,
    knockback: 17,
    stagger: 1.3,
    focusGain: 14,
    hitStop: 0.11,
    shake: 1.4,
    slashType: 3,
  },
  // Spends a full focus meter
  'ATTACK_FINISHER': {
    id: 'ATTACK_FINISHER',
    damage: 95,
    windup: 0.22,
    active: 0.3,
    recovery: 0.45,
    lungeSpeed: 4,
    rangeScale: 2,
    isRadial: true,
    knockback: 22,
    stagger: 2,
    focusGain: 0,
    hitStop: 0.16,
    shake: 2,
    slashType: 4,
  },
};

// Window at the end of ACTIVE/start of RECOVERY where a combo input is accepted
export const COMBO_WINDOW_START = 0.5; // percentage of recovery phase
