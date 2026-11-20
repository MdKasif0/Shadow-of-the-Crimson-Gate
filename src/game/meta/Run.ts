/**
 * Run — How hard this playthrough is: the difficulty chosen at the start, how
 * many times it has been carried into New Game+, and, in Trials, how far the
 * waves have climbed. Combat reads the multipliers from here.
 */

export type Difficulty = 'story' | 'normal' | 'crimson';

export interface DifficultyDef {
  id: Difficulty;
  name: string;
  text: string;
  /** Enemies need this many times as much damage to fall. */
  enemyToughness: number;
  /** The Ronin takes this many times the damage. */
  damageTaken: number;
  /** Spirit Essence gained, as a multiple. */
  essence: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  story: {
    id: 'story', name: 'Story',
    text: 'For the tale. Enemies fall faster and hit half as hard.',
    enemyToughness: 0.7, damageTaken: 0.5, essence: 1,
  },
  normal: {
    id: 'normal', name: 'Normal',
    text: 'The mountain as it was meant to be climbed.',
    enemyToughness: 1, damageTaken: 1, essence: 1,
  },
  crimson: {
    id: 'crimson', name: 'Crimson',
    text: 'Unlocked by finishing the game. Enemies are tougher and hit far harder, but give more essence.',
    enemyToughness: 1.4, damageTaken: 1.6, essence: 1.5,
  },
};

export const Run = {
  difficulty: 'normal' as Difficulty,
  /** 0 for a first journey; each New Game+ adds one. */
  ngPlus: 0,
  /** Extra toughness from Trial waves. */
  trialToughness: 1,

  get def(): DifficultyDef {
    return DIFFICULTIES[this.difficulty];
  },

  get enemyToughness(): number {
    return this.def.enemyToughness * (1 + 0.35 * this.ngPlus) * this.trialToughness;
  },

  get damageTaken(): number {
    return this.def.damageTaken * (1 + 0.25 * this.ngPlus);
  },

  get essence(): number {
    return this.def.essence * (1 + 0.25 * this.ngPlus);
  },

  /** A short label, such as "Crimson · NG+2". */
  get label(): string {
    return `${this.def.name}${this.ngPlus > 0 ? ` · NG+${this.ngPlus > 1 ? this.ngPlus : ''}` : ''}`;
  },

  reset(difficulty: Difficulty = 'normal', ngPlus = 0): void {
    this.difficulty = difficulty;
    this.ngPlus = ngPlus;
    this.trialToughness = 1;
  },
};
