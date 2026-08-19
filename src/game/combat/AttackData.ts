export interface AttackDefinition {
  id: string;
  damage: number;
  windup: number;
  active: number;
  recovery: number;
  lungeSpeed: number;
  nextAttackId?: string; // which attack combos from this one
}

export const ATTACK_DATA: Record<string, AttackDefinition> = {
  'ATTACK_1': {
    id: 'ATTACK_1',
    damage: 20,
    windup: 0.12,
    active: 0.14,
    recovery: 0.25,
    lungeSpeed: 8,
    nextAttackId: 'ATTACK_2'
  },
  'ATTACK_2': {
    id: 'ATTACK_2',
    damage: 24,
    windup: 0.11,
    active: 0.15,
    recovery: 0.27,
    lungeSpeed: 10,
    nextAttackId: 'ATTACK_3'
  },
  'ATTACK_3': {
    id: 'ATTACK_3',
    damage: 35,
    windup: 0.15,
    active: 0.18,
    recovery: 0.35,
    lungeSpeed: 15,
    nextAttackId: undefined // End of combo
  }
};

// Window at the end of ACTIVE/start of RECOVERY where a combo input is accepted
export const COMBO_WINDOW_START = 0.5; // percentage of recovery phase
