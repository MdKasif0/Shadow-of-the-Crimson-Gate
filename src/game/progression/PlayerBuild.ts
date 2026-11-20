import { EventBus } from '../core/EventBus';

/**
 * PlayerBuild — The choices a player makes about how the Ronin fights: skills
 * bought with Spirit Essence, charms found in the world, and the techniques the
 * story teaches. Everything here ends up as one set of modifiers.
 */

export type SkillPath = 'blade' | 'spirit' | 'shadow';

export interface SkillDef {
  id: string;
  path: SkillPath;
  tier: number;
  name: string;
  description: string;
  cost: number;
}

export const SKILL_PATHS: { id: SkillPath; name: string; motto: string }[] = [
  { id: 'blade', name: 'Blade', motto: 'Combos and broken guards' },
  { id: 'spirit', name: 'Spirit', motto: 'Focus, range and resilience' },
  { id: 'shadow', name: 'Shadow', motto: 'Dodges, parries and counters' },
];

export const SKILLS: SkillDef[] = [
  { id: 'honed_edge', path: 'blade', tier: 1, cost: 30, name: 'Honed Edge', description: 'All sword strikes deal 12% more damage.' },
  { id: 'fourth_cut', path: 'blade', tier: 2, cost: 60, name: 'Fourth Cut', description: 'Your light combo gains a fourth, rising strike.' },
  { id: 'guard_breaker', path: 'blade', tier: 3, cost: 95, name: 'Guard Breaker', description: 'Heavy attacks and Dash Strikes wear down guards 60% faster.' },
  { id: 'executioner', path: 'blade', tier: 4, cost: 140, name: 'Executioner', description: 'Executions restore a quarter of your health and 40 focus.' },

  { id: 'deep_well', path: 'spirit', tier: 1, cost: 30, name: 'Deep Well', description: 'Gain focus 30% faster.' },
  { id: 'spirit_vessel', path: 'spirit', tier: 2, cost: 60, name: 'Spirit Vessel', description: 'Raises your maximum health by 30.' },
  { id: 'twin_wave', path: 'spirit', tier: 3, cost: 95, name: 'Triple Wave', description: 'Spirit Wave fires three waves in a fan, and costs less focus.' },
  { id: 'purifying_cut', path: 'spirit', tier: 4, cost: 140, name: 'Purifying Cut', description: 'Spirit Cut reaches 50% further and heals you for 30.' },

  { id: 'light_step', path: 'shadow', tier: 1, cost: 30, name: 'Light Step', description: 'Dash 30% more often.' },
  { id: 'riposte', path: 'shadow', tier: 2, cost: 60, name: 'Riposte', description: 'The counter after a parry or perfect dodge hits far harder.' },
  { id: 'still_water', path: 'shadow', tier: 3, cost: 95, name: 'Still Water', description: 'Parry and perfect-dodge timing is 50% more forgiving.' },
  { id: 'shadow_step', path: 'shadow', tier: 4, cost: 140, name: 'Shadow Step', description: 'Perfect dodges shake the guard of every enemy near you.' },
];

export interface CharmDef {
  id: string;
  name: string;
  description: string;
  /** Where it's found, shown once it's in your collection. */
  origin: string;
}

export const CHARMS: CharmDef[] = [
  { id: 'fox_mask', name: 'Fox Mask', description: 'Deal 15% more damage while above 80% health.', origin: 'Left beneath a cracked lantern in the courtyard.' },
  { id: 'ember_bead', name: 'Ember Bead', description: 'Each kill restores 6 health.', origin: 'Hidden among the roots off the forest path.' },
  { id: 'crane_feather', name: 'Crane Feather', description: 'Dash 25% more often.', origin: 'Caught in the brush beside the mountain gate.' },
  { id: 'keepers_bell', name: "Keeper's Bell", description: 'Blocking stops 90% of damage instead of 60%.', origin: 'A gift from the Shrine Keeper.' },
  { id: 'moon_tear', name: 'Moon Tear', description: 'Parries are easier to time.', origin: 'Sealed away behind the courtyard’s spirit ward.' },
  { id: 'blood_lotus', name: 'Blood Lotus', description: 'Deal 40% more damage to staggered and broken enemies.', origin: 'Taken from the Hollow Widow.' },
  { id: 'river_stone', name: 'River Stone', description: 'Water and webs barely slow you.', origin: 'Lying in the deep water at the edge of the Drowned Village.' },
  { id: 'spirit_moth', name: 'Spirit Moth', description: 'Perfect dodges restore 8 health.', origin: 'Resting in a dead end of the Bamboo Labyrinth.' },
  { id: 'ash_sutra', name: 'Ash Sutra', description: 'Fire, falls and corruption hurt you half as much.', origin: 'Kept from the flames in the Burning Temple’s courtyard.' },
  { id: 'crimson_ribbon', name: 'Crimson Ribbon', description: 'Counters deal 25% more damage.', origin: 'Akane’s, given when she yielded at the gate.' },
  { id: 'yomi_pearl', name: 'Pearl of Yomi', description: 'Raises your maximum health by 20.', origin: 'Found on the terraces below the Gate.' },
  // Only in New Game+, each dropped by a guardian the second time it falls
  { id: 'oni_horn', name: 'Oni Horn', description: 'Deal 20% more damage, and take 10% more.', origin: 'Broken from the Crimson Oni in New Game+.' },
  { id: 'drowned_bell', name: 'Drowned Bell', description: 'Perfect dodges are 30% easier to time.', origin: 'Rung by Umibōzu as it sank, in New Game+.' },
  { id: 'jade_silk', name: 'Jade Silk', description: 'Each kill restores 10 health.', origin: 'Left in the web of the Jorōgumo, in New Game+.' },
  { id: 'cinder_crest', name: 'Cinder Crest', description: 'Fire, falls and corruption barely touch you.', origin: 'Torn from the Fallen Samurai’s helm in New Game+.' },
  { id: 'eye_of_yomi', name: 'Eye of Yomi', description: 'Gain focus 50% faster.', origin: 'What was left of the Maw, in New Game+.' },
];

/** The charm each guardian drops once New Game+ begins. */
export const NG_PLUS_DROPS: Record<string, string> = {
  CRIMSON_ONI: 'oni_horn',
  UMIBOZU: 'drowned_bell',
  JOROGUMO: 'jade_silk',
  FALLEN_SAMURAI: 'cinder_crest',
  MAW_OF_YOMI: 'eye_of_yomi',
};

/** Charm slots at the start. Clearing the Bamboo Labyrinth adds one more. */
export const CHARM_SLOTS = 2;
export const MAX_CHARM_SLOTS = 3;

export type TechniqueId = 'dashStrike' | 'spiritWave' | 'crimsonWhirl';

export const TECHNIQUES: Record<TechniqueId, { name: string; how: string }> = {
  dashStrike: { name: 'Dash Strike', how: 'Attack while dashing to cut through enemies' },
  spiritWave: { name: 'Spirit Wave', how: 'Spend focus to loose a wave of spirit at range' },
  crimsonWhirl: { name: 'Crimson Whirl', how: 'Heavy attack while sprinting to spin through a crowd' },
};

export interface BuildModifiers {
  damage: number;
  /** Extra damage multiplier while above 80% health. */
  healthyDamage: number;
  /** Extra damage multiplier against staggered or broken enemies. */
  staggeredDamage: number;
  focusGain: number;
  maxHealthBonus: number;
  dashCooldown: number;
  parryWindow: number;
  dodgeWindow: number;
  counterDamage: number;
  blockReduction: number;
  postureDamage: number;
  healOnKill: number;
  hasFourthCut: boolean;
  hasTripleWave: boolean;
  waveCost: number;
  finisherRange: number;
  finisherHeal: number;
  executionHeal: number;
  executionFocus: number;
  hasShadowStep: boolean;
  /** How much of the slowing from water and webs still applies. */
  footingResist: number;
  dodgeHeal: number;
  /** Multiplier on damage from fire, falls and corruption. */
  hazardResist: number;
  /** Multiplier on damage taken from enemies. */
  damageTaken: number;
}

export interface BuildSave {
  skills: string[];
  charms: string[];
  equipped: (string | null)[];
  techniques: TechniqueId[];
}

const clampSlots = (n: number) => Math.min(MAX_CHARM_SLOTS, Math.max(CHARM_SLOTS, n));

export class PlayerBuild {
  public skills = new Set<string>();
  public charms = new Set<string>();
  public equipped: (string | null)[] = new Array(CHARM_SLOTS).fill(null);
  public techniques = new Set<TechniqueId>();

  public get slotCount(): number {
    return this.equipped.length;
  }

  /** Opens more charm slots. Never takes any away. */
  public setSlotCount(count: number): void {
    const target = Math.min(MAX_CHARM_SLOTS, Math.max(this.equipped.length, count));
    if (target === this.equipped.length) return;
    while (this.equipped.length < target) this.equipped.push(null);
    EventBus.emit('buildChanged', {});
  }

  public get level(): number {
    return 1 + this.skills.size;
  }

  public canBuy(skill: SkillDef, essence: number): boolean {
    return !this.skills.has(skill.id) && this.hasPrerequisite(skill) && essence >= skill.cost;
  }

  /** Earlier tiers of a path come first. */
  public hasPrerequisite(skill: SkillDef): boolean {
    if (skill.tier === 1) return true;
    return SKILLS.some(s => s.path === skill.path && s.tier === skill.tier - 1 && this.skills.has(s.id));
  }

  public buy(skillId: string): void {
    this.skills.add(skillId);
    EventBus.emit('buildChanged', {});
  }

  public addCharm(charmId: string): void {
    if (this.charms.has(charmId)) return;
    this.charms.add(charmId);
    // A first find goes straight into an empty slot
    const empty = this.equipped.indexOf(null);
    if (empty >= 0) this.equipped[empty] = charmId;
    EventBus.emit('buildChanged', {});
  }

  public toggleCharm(charmId: string): boolean {
    const slot = this.equipped.indexOf(charmId);
    if (slot >= 0) {
      this.equipped[slot] = null;
    } else {
      const empty = this.equipped.indexOf(null);
      if (empty < 0) return false;
      this.equipped[empty] = charmId;
    }
    EventBus.emit('buildChanged', {});
    return true;
  }

  public isEquipped(charmId: string): boolean {
    return this.equipped.includes(charmId);
  }

  public learn(technique: TechniqueId): boolean {
    if (this.techniques.has(technique)) return false;
    this.techniques.add(technique);
    EventBus.emit('buildChanged', {});
    return true;
  }

  public get modifiers(): BuildModifiers {
    const has = (id: string) => this.skills.has(id);
    const wears = (id: string) => this.isEquipped(id);
    const dashCooldown = (has('light_step') ? 0.7 : 1) * (wears('crane_feather') ? 0.75 : 1);

    return {
      damage: (has('honed_edge') ? 1.12 : 1) * (wears('oni_horn') ? 1.2 : 1),
      healthyDamage: wears('fox_mask') ? 1.15 : 1,
      staggeredDamage: wears('blood_lotus') ? 1.4 : 1,
      focusGain: (has('deep_well') ? 1.3 : 1) * (wears('eye_of_yomi') ? 1.5 : 1),
      maxHealthBonus: (has('spirit_vessel') ? 30 : 0) + (wears('yomi_pearl') ? 20 : 0),
      dashCooldown,
      parryWindow: (0.2 + (wears('moon_tear') ? 0.07 : 0)) * (has('still_water') ? 1.5 : 1),
      dodgeWindow: 0.3 * (has('still_water') ? 1.5 : 1) * (wears('drowned_bell') ? 1.3 : 1),
      counterDamage: (has('riposte') ? 2.2 : 1.5) * (wears('crimson_ribbon') ? 1.25 : 1),
      blockReduction: wears('keepers_bell') ? 0.9 : 0.6,
      postureDamage: has('guard_breaker') ? 1.6 : 1,
      healOnKill: (wears('ember_bead') ? 6 : 0) + (wears('jade_silk') ? 10 : 0),
      hasFourthCut: has('fourth_cut'),
      hasTripleWave: has('twin_wave'),
      waveCost: has('twin_wave') ? 20 : 25,
      finisherRange: has('purifying_cut') ? 1.5 : 1,
      finisherHeal: has('purifying_cut') ? 30 : 0,
      executionHeal: has('executioner') ? 0.25 : 0,
      executionFocus: has('executioner') ? 40 : 0,
      hasShadowStep: has('shadow_step'),
      footingResist: wears('river_stone') ? 0.25 : 1,
      dodgeHeal: wears('spirit_moth') ? 8 : 0,
      hazardResist: (wears('ash_sutra') ? 0.5 : 1) * (wears('cinder_crest') ? 0.25 : 1),
      damageTaken: wears('oni_horn') ? 1.1 : 1,
    };
  }

  public toSave(): BuildSave {
    return {
      skills: [...this.skills],
      charms: [...this.charms],
      equipped: [...this.equipped],
      techniques: [...this.techniques],
    };
  }

  public load(data: Partial<BuildSave> | undefined): void {
    this.skills = new Set(data?.skills ?? []);
    this.charms = new Set(data?.charms ?? []);
    const slots = clampSlots(data?.equipped?.length ?? CHARM_SLOTS);
    this.equipped = new Array(slots).fill(null);
    (data?.equipped ?? []).slice(0, slots).forEach((id, i) => {
      this.equipped[i] = id && this.charms.has(id) ? id : null;
    });
    this.techniques = new Set(data?.techniques ?? []);
    EventBus.emit('buildChanged', {});
  }

  public wipe(): void {
    this.load(undefined);
  }
}
