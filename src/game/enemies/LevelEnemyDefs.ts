import { EnemyConfig } from './EnemyConfig';
import { LevelEnemyDef } from './LevelEnemyTypes';
import {
  buildAkaneRival, buildFallenSamurai, buildJorogumo, buildKamaitachi, buildKappa,
  buildMawOfYomi, buildPossessedMonk, buildSpiderling, buildUmibozu,
} from './LevelEnemyModels';

/**
 * LevelEnemyDefs — The yokai of levels II to V, and their bosses. Each boss
 * learns new moves as its health falls, so every phase asks something new.
 */

const stats = (type: string, overrides: Partial<EnemyConfig>): EnemyConfig => ({
  enemyType: type,
  maxHealth: 100,
  movementSpeed: 2.5,
  detectionRange: 14,
  attackRange: 2.5,
  attackCooldownMin: 1.2,
  attackCooldownMax: 1.9,
  damage: 15,
  knockback: 12,
  knockbackResistance: 0,
  preferredDistance: 2.2,
  aggression: 0.8,
  attackWindup: 0.5,
  attackActive: 0.2,
  attackRecovery: 0.4,
  hurtDuration: 0.4,
  collisionRadius: 0.6,
  hurtboxRadius: 0.6,
  hurtboxHeight: 2,
  ...overrides,
});

// ─── Level II: The Drowned Village ─────────────────────────────────────────

export const KAPPA: LevelEnemyDef = {
  type: 'KAPPA',
  name: 'Kappa',
  config: stats('KAPPA', { maxHealth: 120, movementSpeed: 2.7, preferredDistance: 2.4, knockbackResistance: 0.2, hurtboxHeight: 1.7, hurtboxRadius: 0.65 }),
  moves: [
    { id: 'claw', kind: 'swipe', maxRange: 2.7, windup: 0.45, active: 0.2, recovery: 0.45, cooldown: 1, damage: 14, reach: 2.3 },
    {
      id: 'grab', kind: 'grab', minRange: 1.6, maxRange: 5.5, windup: 0.75, active: 0.35, recovery: 0.8, cooldown: 6,
      damage: 8, reach: 1.3, lungeSpeed: 11, grabSeconds: 1.8, throwDamage: 22, unblockable: true, callout: 'GRAB', weight: 1.4,
    },
  ],
  model: buildKappa,
  rimColor: 0x7ad06a,
  rimIntensity: 0.2,
  essence: 22,
  role: 'melee',
  ignoresFooting: true,
};

export const UMIBOZU: LevelEnemyDef = {
  type: 'UMIBOZU',
  name: 'Umibōzu',
  config: stats('UMIBOZU', {
    maxHealth: 1500, movementSpeed: 1.5, detectionRange: 60, attackRange: 10, attackCooldownMin: 1.3, attackCooldownMax: 2.1,
    damage: 22, knockbackResistance: 1, preferredDistance: 5, aggression: 1, hurtDuration: 0.5,
    collisionRadius: 2.4, hurtboxRadius: 2.5, hurtboxHeight: 5,
  }),
  moves: [
    { id: 'crash', kind: 'slam', maxRange: 6, windup: 1.2, active: 0.25, recovery: 1, cooldown: 4, damage: 30, reach: 5.2, knockback: 22 },
    { id: 'sweep', kind: 'swipe', maxRange: 7.5, windup: 1, active: 0.3, recovery: 0.9, cooldown: 3, damage: 24, reach: 7.5, angle: 2.2, lungeSpeed: 0 },
    { id: 'wave', kind: 'shoot', minRange: 4, maxRange: 24, windup: 0.9, active: 0.1, recovery: 0.7, cooldown: 3.5, damage: 18, projectile: 'WATER', count: 5, spread: 1, speed: 10 },
    { id: 'flood', kind: 'hazard', maxRange: 40, windup: 1, active: 0.1, recovery: 0.6, cooldown: 8, damage: 16, hazard: 'water', hazardCount: 3, hazardRadius: 3, callout: 'THE FLOOD RISES' },
    { id: 'kappa', kind: 'summon', maxRange: 40, windup: 1.2, active: 0.1, recovery: 0.8, cooldown: 18, damage: 0, summon: 'KAPPA', summonCount: 2, callout: 'KAPPA RISE' },
  ],
  phases: [
    { at: 1, moves: ['crash', 'sweep', 'wave'] },
    { at: 0.65, moves: ['crash', 'sweep', 'wave', 'flood'], speed: 1.15, title: 'The tide turns', text: 'Umibōzu calls the flood. Keep out of the dark water.' },
    { at: 0.3, moves: ['crash', 'sweep', 'wave', 'flood', 'kappa'], speed: 1.3, title: 'From the depths', text: 'Kappa rise to defend it. Cut them down, or keep moving.' },
  ],
  model: buildUmibozu,
  rimColor: 0x6ab0e0,
  rimIntensity: 0.25,
  essence: 80,
  role: 'boss',
  isBoss: true,
  armor: 'full',
  ignoresFooting: true,
};

// ─── Level III: The Bamboo Labyrinth ───────────────────────────────────────

const kamaitachiMoves: LevelEnemyDef['moves'] = [
  { id: 'dashcut', kind: 'lunge', minRange: 2.5, maxRange: 8, windup: 0.5, active: 0.4, recovery: 0.55, cooldown: 2.5, damage: 16, reach: 1.4, lungeSpeed: 16 },
  { id: 'flurry', kind: 'swipe', maxRange: 2.4, windup: 0.3, active: 0.12, recovery: 0.25, cooldown: 3, damage: 7, reach: 2.2, repeat: 3 },
];

export const KAMAITACHI: LevelEnemyDef = {
  type: 'KAMAITACHI',
  name: 'Kamaitachi',
  config: stats('KAMAITACHI', {
    maxHealth: 70, movementSpeed: 5.2, detectionRange: 18, preferredDistance: 4.5, aggression: 0.85,
    attackCooldownMin: 1.6, attackCooldownMax: 2.4, hurtDuration: 0.3, collisionRadius: 0.5, hurtboxRadius: 0.55, hurtboxHeight: 1.2,
  }),
  moves: kamaitachiMoves,
  model: buildKamaitachi,
  rimColor: 0x8ae0ff,
  rimIntensity: 0.22,
  essence: 20,
  role: 'flanker',
};

export const KAMAITACHI_LURKER: LevelEnemyDef = { ...KAMAITACHI, type: 'KAMAITACHI_LURKER', name: 'Lurking Kamaitachi', ambush: true, essence: 24 };

export const SPIDERLING: LevelEnemyDef = {
  type: 'SPIDERLING',
  name: 'Spiderling',
  config: stats('SPIDERLING', { maxHealth: 35, movementSpeed: 4.2, damage: 8, preferredDistance: 1.6, hurtboxHeight: 0.9, collisionRadius: 0.45, hurtboxRadius: 0.5 }),
  moves: [{ id: 'bite', kind: 'swipe', maxRange: 1.9, windup: 0.35, active: 0.15, recovery: 0.35, cooldown: 1, damage: 8, reach: 1.7 }],
  model: buildSpiderling,
  rimColor: 0xff6a3a,
  rimIntensity: 0.18,
  essence: 3,
  role: 'melee',
  ignoresFooting: true,
};

export const JOROGUMO: LevelEnemyDef = {
  type: 'JOROGUMO',
  name: 'Jorōgumo',
  config: stats('JOROGUMO', {
    maxHealth: 1300, movementSpeed: 3, detectionRange: 50, preferredDistance: 4, aggression: 1,
    attackCooldownMin: 1.1, attackCooldownMax: 1.8, knockbackResistance: 0.9, hurtDuration: 0.5,
    collisionRadius: 1.9, hurtboxRadius: 2, hurtboxHeight: 4,
  }),
  moves: [
    { id: 'stab', kind: 'swipe', maxRange: 3.6, windup: 0.6, active: 0.2, recovery: 0.5, cooldown: 2.5, damage: 20, reach: 3.4, angle: 1.4, repeat: 2 },
    { id: 'pounce', kind: 'lunge', minRange: 4, maxRange: 11, windup: 0.8, active: 0.45, recovery: 0.8, cooldown: 5, damage: 26, reach: 2, lungeSpeed: 15 },
    { id: 'webshot', kind: 'shoot', minRange: 3, maxRange: 18, windup: 0.7, active: 0.1, recovery: 0.6, cooldown: 3.5, damage: 14, projectile: 'POISON', count: 3, spread: 0.6, speed: 12 },
    { id: 'webs', kind: 'hazard', maxRange: 25, windup: 0.8, active: 0.1, recovery: 0.6, cooldown: 9, damage: 6, hazard: 'web', hazardCount: 3, hazardRadius: 2.6, callout: 'WEBS' },
    { id: 'brood', kind: 'summon', maxRange: 40, windup: 1, active: 0.1, recovery: 0.6, cooldown: 14, damage: 0, summon: 'SPIDERLING', summonCount: 2 },
    { id: 'drop', kind: 'blink', minRange: 3, maxRange: 25, windup: 0.7, active: 0.25, recovery: 0.6, cooldown: 7, damage: 22, reach: 3, angle: 1.6 },
  ],
  phases: [
    { at: 1, moves: ['stab', 'pounce', 'webshot'] },
    { at: 0.6, moves: ['stab', 'pounce', 'webshot', 'webs', 'brood'], speed: 1.1, title: 'The web tightens', text: 'Webs slow you. Her brood answers her call.' },
    { at: 0.3, moves: ['stab', 'pounce', 'webshot', 'webs', 'brood', 'drop'], speed: 1.25, title: 'She drops from the dark', text: 'She vanishes and strikes from behind. Listen for her.' },
  ],
  model: buildJorogumo,
  rimColor: 0xff4060,
  rimIntensity: 0.22,
  essence: 85,
  role: 'boss',
  isBoss: true,
  armor: 'full',
  ignoresFooting: true,
};

// ─── Level IV: The Burning Temple ──────────────────────────────────────────

export const POSSESSED_MONK: LevelEnemyDef = {
  type: 'POSSESSED_MONK',
  name: 'Possessed Monk',
  config: stats('POSSESSED_MONK', {
    maxHealth: 110, movementSpeed: 2.2, detectionRange: 18, preferredDistance: 6, aggression: 0.7,
    attackCooldownMin: 1.8, attackCooldownMax: 2.8, collisionRadius: 0.55,
  }),
  moves: [
    { id: 'fireball', kind: 'shoot', minRange: 3, maxRange: 15, windup: 0.75, active: 0.1, recovery: 0.6, cooldown: 2.5, damage: 16, projectile: 'FIRE', speed: 11 },
    { id: 'pyre', kind: 'hazard', maxRange: 12, windup: 0.9, active: 0.1, recovery: 0.6, cooldown: 7, damage: 18, hazard: 'fire', hazardCount: 2, hazardRadius: 2.2 },
    { id: 'staff', kind: 'swipe', maxRange: 2.6, windup: 0.5, active: 0.2, recovery: 0.5, cooldown: 1.5, damage: 14, reach: 2.4 },
  ],
  model: buildPossessedMonk,
  rimColor: 0xff9a4a,
  rimIntensity: 0.22,
  essence: 26,
  role: 'support',
  armor: 'attacking',
};

export const FALLEN_SAMURAI: LevelEnemyDef = {
  type: 'FALLEN_SAMURAI',
  name: 'The Fallen Samurai',
  config: stats('FALLEN_SAMURAI', {
    maxHealth: 1200, movementSpeed: 3.4, detectionRange: 50, preferredDistance: 2.6, aggression: 1,
    attackCooldownMin: 0.9, attackCooldownMax: 1.5, knockbackResistance: 0.6, hurtDuration: 0.45,
    collisionRadius: 0.6, hurtboxRadius: 0.7, hurtboxHeight: 2.2,
  }),
  moves: [
    { id: 'cuts', kind: 'swipe', maxRange: 3, windup: 0.5, active: 0.16, recovery: 0.3, cooldown: 3, damage: 16, reach: 2.7, repeat: 3, lungeSpeed: 5 },
    { id: 'iai', kind: 'lunge', minRange: 3.5, maxRange: 10, windup: 0.8, active: 0.3, recovery: 0.7, cooldown: 5, damage: 28, reach: 1.8, lungeSpeed: 22, callout: 'IAI' },
    { id: 'cleave', kind: 'swipe', maxRange: 3.2, windup: 1, active: 0.2, recovery: 0.7, cooldown: 4, damage: 30, reach: 3, angle: 1, knockback: 20 },
    { id: 'firecut', kind: 'shoot', minRange: 4, maxRange: 16, windup: 0.7, active: 0.1, recovery: 0.5, cooldown: 4, damage: 18, projectile: 'FIRE', count: 3, spread: 0.7, speed: 14 },
    { id: 'embers', kind: 'hazard', maxRange: 20, windup: 0.8, active: 0.1, recovery: 0.5, cooldown: 8, damage: 16, hazard: 'fire', hazardCount: 3, hazardRadius: 2 },
    { id: 'step', kind: 'blink', minRange: 3, maxRange: 20, windup: 0.4, active: 0.2, recovery: 0.5, cooldown: 6, damage: 20, reach: 2.6 },
  ],
  phases: [
    { at: 1, moves: ['cuts', 'iai', 'cleave'] },
    { at: 0.6, moves: ['cuts', 'iai', 'cleave', 'firecut', 'embers'], speed: 1.1, title: 'His blade catches fire', text: 'Fire follows his cuts now. Parry, or get out of the way.' },
    { at: 0.3, moves: ['cuts', 'iai', 'cleave', 'firecut', 'embers', 'step'], speed: 1.3, title: 'He stops holding back', text: 'He moves like you do. Watch for the step behind you.' },
  ],
  model: buildFallenSamurai,
  rimColor: 0xff5a2a,
  rimIntensity: 0.26,
  essence: 85,
  role: 'boss',
  isBoss: true,
  armor: 'attacking',
  guardChance: 0.3,
};

// ─── Level V: The Gate Itself ──────────────────────────────────────────────

export const AKANE: LevelEnemyDef = {
  type: 'AKANE',
  name: 'Akane',
  config: stats('AKANE', {
    maxHealth: 700, movementSpeed: 3.8, detectionRange: 40, preferredDistance: 2.6, aggression: 1,
    attackCooldownMin: 1, attackCooldownMax: 1.6, knockbackResistance: 0.5, hurtDuration: 0.4,
  }),
  moves: [
    { id: 'cuts', kind: 'swipe', maxRange: 3, windup: 0.45, active: 0.16, recovery: 0.3, cooldown: 2.6, damage: 15, reach: 2.6, repeat: 2, lungeSpeed: 5 },
    { id: 'rush', kind: 'lunge', minRange: 3.5, maxRange: 10, windup: 0.7, active: 0.3, recovery: 0.6, cooldown: 4.5, damage: 22, reach: 1.8, lungeSpeed: 20 },
    { id: 'step', kind: 'blink', minRange: 3, maxRange: 18, windup: 0.45, active: 0.2, recovery: 0.5, cooldown: 6, damage: 18, reach: 2.6 },
  ],
  phases: [
    { at: 1, moves: ['cuts', 'rush'] },
    { at: 0.5, moves: ['cuts', 'rush', 'step'], speed: 1.2, title: 'Akane will not yield', text: 'She fights with her brother’s sword now, and she is fast.' },
  ],
  model: buildAkaneRival,
  yields: true,
  rimColor: 0xffa080,
  rimIntensity: 0.24,
  essence: 60,
  role: 'boss',
  isBoss: true,
  armor: 'attacking',
  guardChance: 0.25,
};

export const MAW_OF_YOMI: LevelEnemyDef = {
  type: 'MAW_OF_YOMI',
  name: 'The Maw of Yomi',
  config: stats('MAW_OF_YOMI', {
    maxHealth: 2400, movementSpeed: 0.6, detectionRange: 80, preferredDistance: 6, aggression: 1,
    attackCooldownMin: 1.1, attackCooldownMax: 1.8, knockbackResistance: 1, hurtDuration: 0.5,
    collisionRadius: 2.8, hurtboxRadius: 3, hurtboxHeight: 6,
  }),
  moves: [
    { id: 'crush', kind: 'slam', maxRange: 6.5, windup: 1.2, active: 0.25, recovery: 0.9, cooldown: 4, damage: 30, reach: 6, knockback: 24 },
    { id: 'lash', kind: 'swipe', maxRange: 9, windup: 1, active: 0.3, recovery: 0.8, cooldown: 3, damage: 24, reach: 9, angle: 2, lungeSpeed: 0 },
    { id: 'barrage', kind: 'shoot', minRange: 4, maxRange: 30, windup: 0.9, active: 0.1, recovery: 0.6, cooldown: 3.5, damage: 16, projectile: 'VOID', count: 5, spread: 1.4, speed: 11 },
    { id: 'eruption', kind: 'hazard', maxRange: 40, windup: 1, active: 0.1, recovery: 0.6, cooldown: 7, damage: 30, hazard: 'burst', hazardCount: 4, hazardRadius: 2.6, callout: 'THE GROUND OPENS' },
    { id: 'shadows', kind: 'summon', maxRange: 40, windup: 1.1, active: 0.1, recovery: 0.6, cooldown: 16, damage: 0, summon: 'SHADOW_YOKAI', summonCount: 2 },
    {
      id: 'snatch', kind: 'grab', minRange: 4, maxRange: 10, windup: 1.1, active: 0.25, recovery: 0.9, cooldown: 9,
      damage: 10, reach: 10, angle: 0.5, lungeSpeed: 0.01, grabSeconds: 2.2, throwDamage: 30, unblockable: true, callout: 'IT REACHES FOR YOU',
    },
  ],
  phases: [
    { at: 1, moves: ['crush', 'lash', 'barrage'] },
    { at: 0.66, moves: ['crush', 'lash', 'barrage', 'eruption', 'shadows'], speed: 1.1, title: 'Yomi stirs', text: 'The ground splits beneath you, and shadows crawl out of it.' },
    { at: 0.33, moves: ['crush', 'lash', 'barrage', 'eruption', 'shadows', 'snatch'], speed: 1.3, title: 'The Maw opens', text: 'It reaches for you. Dodge the grasp, or struggle free.' },
  ],
  model: buildMawOfYomi,
  rimColor: 0xff2a3a,
  rimIntensity: 0.28,
  essence: 150,
  role: 'boss',
  isBoss: true,
  armor: 'full',
  ignoresFooting: true,
};

export const LEVEL_ENEMIES: Record<string, LevelEnemyDef> = {
  KAPPA, UMIBOZU, KAMAITACHI, KAMAITACHI_LURKER, SPIDERLING, JOROGUMO, POSSESSED_MONK, FALLEN_SAMURAI, AKANE, MAW_OF_YOMI,
};
