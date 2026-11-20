import * as THREE from 'three';
import { EnemyConfig } from './EnemyConfig';
import { ProjectileType } from '../combat/Projectile';

/**
 * LevelEnemyTypes — The data that defines the yokai of the later levels. Each
 * one is a set of stats, a model, and a list of moves; bosses add phases that
 * swap the moves out as their health falls.
 */

export type MoveKind =
  /** A blow in an arc in front. */
  | 'swipe'
  /** A blow all around. */
  | 'slam'
  /** A fast rush forward that hurts anything in its path. */
  | 'lunge'
  /** A lunge that seizes the player and holds them until they struggle free. */
  | 'grab'
  /** Projectiles, in a fan. */
  | 'shoot'
  /** Ground hazards around the player or the enemy. */
  | 'hazard'
  /** Raises lesser enemies to fight alongside. */
  | 'summon'
  /** Vanishes and reappears at the player's back. */
  | 'blink';

export type HazardKind = 'burst' | 'fire' | 'web' | 'water';

export interface MoveDef {
  id: string;
  kind: MoveKind;
  /** Usable when the player is between these distances. */
  minRange?: number;
  maxRange: number;
  windup: number;
  active: number;
  recovery: number;
  /** Seconds before this move can be used again. */
  cooldown: number;
  /** Relative chance of being picked when several moves are usable. */
  weight?: number;
  damage: number;
  knockback?: number;
  /** Hitbox reach for blows. */
  reach?: number;
  /** Arc width in radians. */
  angle?: number;
  /** Forward speed during the active part, for lunges and rushing blows. */
  lungeSpeed?: number;
  /** How many times the blow repeats, for combos. */
  repeat?: number;
  /** Can't be blocked or parried. Dodge it. */
  unblockable?: boolean;
  /** Shown above the enemy as it begins, to teach the move. */
  callout?: string;

  projectile?: ProjectileType;
  count?: number;
  /** Total fan width in radians. */
  spread?: number;
  speed?: number;

  hazard?: HazardKind;
  hazardCount?: number;
  hazardRadius?: number;
  /** Place hazards around the enemy rather than at the player. */
  aroundSelf?: boolean;

  summon?: string;
  summonCount?: number;

  grabSeconds?: number;
  /** Damage when a grab ends without the player breaking free. */
  throwDamage?: number;
}

export interface PhaseDef {
  /** Begins when health drops to this fraction. The first phase uses 1. */
  at: number;
  /** Ids of the moves available in this phase. */
  moves: string[];
  speed?: number;
  /** Shown as the phase begins. */
  title?: string;
  text?: string;
}

/** What a model's animation needs to know each frame. */
export interface PoseInput {
  dt: number;
  time: number;
  /** 'idle', 'move', 'attack', 'hurt', 'dead', 'hold' or 'roar'. */
  action: 'idle' | 'move' | 'attack' | 'hurt' | 'dead' | 'hold' | 'roar';
  move: MoveKind | null;
  stage: 'windup' | 'active' | 'recovery' | null;
  /** 0 to 1 through the current stage. */
  progress: number;
  /** Ground speed this frame. */
  speed: number;
}

export interface LevelEnemyModel {
  root: THREE.Group;
  /** Sets the pose for this frame. */
  animate: (pose: PoseInput) => void;
}

export type DirectorRole = 'melee' | 'flanker' | 'support' | 'boss';

export interface LevelEnemyDef {
  type: string;
  name: string;
  config: EnemyConfig;
  moves: MoveDef[];
  /** For bosses. The first phase should be `at: 1`. */
  phases?: PhaseDef[];
  model: () => LevelEnemyModel;
  rimColor: number;
  rimIntensity: number;
  /** Spirit Essence for a kill. Bosses also count as elite, which multiplies it. */
  essence: number;
  role: DirectorRole;
  isBoss?: boolean;
  /**
   * 'none' flinches at every blow; 'attacking' shrugs off blows mid-attack;
   * 'full' only flinches when staggered or guard-broken.
   */
  armor?: 'none' | 'attacking' | 'full';
  /** Chance to turn aside a blow while not attacking. */
  guardChance?: number;
  /** Moves through water and webs without slowing. */
  ignoresFooting?: boolean;
  /** Waits unseen until the player comes close, then strikes from behind. */
  ambush?: boolean;
  /** Beaten rather than slain: lowers the blade and stands, without a death burst. */
  yields?: boolean;
}

/** The parts of the scene a level enemy reaches into. Set by the scene. */
export interface LevelEnemyWorld {
  playerPosition: THREE.Vector3;
  isPlayerRooted: () => boolean;
  rootPlayer: (seconds: number) => void;
  hurtPlayer: (amount: number, direction: THREE.Vector3, knockback: number) => void;
  footing: (x: number, z: number) => number;
  groundHeight: (x: number, z: number) => number;
  spawnHazard: (kind: HazardKind, position: THREE.Vector3, radius: number, damage: number) => void;
  callout: (position: THREE.Vector3, text: string) => void;
  onPhase: (name: string, title: string, text: string) => void;
}
