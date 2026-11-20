import * as THREE from 'three';
import { EncounterConfig } from '../encounters/EncounterConfig';
import { SecretDef } from '../world/WorldSecrets';
import { LightSource } from '../lighting/WorldLights';
import { Ronin } from '../characters/Ronin';
import { Enemy } from '../enemies/Enemy';
import { VFXManager } from '../vfx/VFXManager';
import { CameraController } from '../camera/CameraController';
import { ArenaHazardSystem } from '../boss/arena/ArenaHazardSystem';
import { ProjectileSystem } from '../combat/ProjectileSystem';
import { StoryFlags } from '../story/StoryFlag';

/**
 * LevelTypes — The shape of a level. The Crimson Courtyard is the original
 * mountain and keeps its own systems; every later level is built from a
 * LevelRuntime, swapped in on arrival and thrown away on departure.
 */

export type LevelId = 'courtyard' | 'village' | 'bamboo' | 'temple' | 'gate';

export const LEVEL_ORDER: LevelId[] = ['courtyard', 'village', 'bamboo', 'temple', 'gate'];

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const inRect = (r: Rect, x: number, z: number): boolean =>
  x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;

export interface LevelAtmosphere {
  fogColor: number;
  fogDensity: number;
  ambientColor: number;
  ambientIntensity: number;
  /** Strength of the moonlight. The courtyard uses 2.6. */
  moonIntensity?: number;
  /** The light the Ronin carries: a lantern, in the dark levels. */
  heroLight?: { color: number; intensity: number; distance: number };
}

export interface LevelShrine {
  id: string;
  name: string;
  position: THREE.Vector3;
  /** Where the Ronin wakes after resting or dying. */
  rest: THREE.Vector3;
}

/** What a level's rules can see and touch each frame. */
export interface LevelContext {
  dt: number;
  time: number;
  player: Ronin;
  enemies: Enemy[];
  vfx: VFXManager;
  camera: CameraController;
  hazards: ArenaHazardSystem;
  projectiles: ProjectileSystem;
  flags: StoryFlags;
  /** True from the moment the level's boss fight starts until the boss falls. */
  isBossFight: boolean;
  isBossDefeated: boolean;
  /** Damage that ignores guards, such as fire or a fall. */
  hurtPlayer: (amount: number, label?: string) => void;
  notice: (title: string, text: string) => void;
  /** Multiplier on hazard damage from the player's charms. */
  hazardResist: number;
  spawnHazard: (kind: 'burst' | 'fire' | 'web' | 'water', position: THREE.Vector3, radius: number, damage: number, life?: number) => void;
  teleportPlayer: (position: THREE.Vector3) => void;
  /** Things this level remembers across deaths and saves, by id. */
  memory: { has: (id: string) => boolean; add: (id: string) => void };
  /** Marks the level beaten: records the time and opens the way on. */
  completeLevel: () => void;
  /** Shows a countdown, or hides it with null. */
  setCountdown: (label: string, seconds: number | null) => void;
}

/** Everything a level built for the current visit. */
export interface LevelRuntime {
  group: THREE.Group;
  lights: LightSource[];
  /** Tall pieces that fade when they come between the camera and the player. */
  occluders: THREE.Object3D[];
  spawn: THREE.Vector3;
  bounds: { MIN_X: number; MAX_X: number; MIN_Z: number; MAX_Z: number };
  atmosphere: LevelAtmosphere;
  shrine: LevelShrine;
  /** The gate onward, opened once the boss falls. */
  exit: THREE.Vector3;
  encounters: EncounterConfig[];
  bossEncounterId: string;
  secrets: SecretDef[];
  /** Which ambience the audio system should play here. */
  audioZone: string;
  /** Height of the floor here, for decks, roofs and ramps. */
  groundHeight: (x: number, z: number) => number;
  /** 1 for normal footing; lower in water, webs and the like. */
  footing: (x: number, z: number) => number;
  /** Per-frame rules: rain, darkness, fire, wind. Can override the atmosphere. */
  update: (ctx: LevelContext) => Partial<LevelAtmosphere> | void;
  /** Puts the level's own state back, after a death or a rest. */
  reset: () => void;
  /** Called the moment the boss falls. */
  onBossDefeated?: (ctx: LevelContext) => void;
  /** The level decides when it's beaten (after an escape, say), not the boss's death. */
  defersCompletion?: boolean;
  /** Called when the boss fight begins. */
  onBossStart?: (ctx: LevelContext) => void;
  dispose: () => void;
}

/** Per-level record kept in the save. */
export interface LevelProgressSave {
  current: LevelId;
  unlocked: LevelId[];
  cleared: LevelId[];
  /** Fastest clear of each level, in seconds. */
  bestTimes: Partial<Record<LevelId, number>>;
}

export function createDefaultLevelProgress(): LevelProgressSave {
  return { current: 'courtyard', unlocked: ['courtyard'], cleared: [], bestTimes: {} };
}
