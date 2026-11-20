import * as THREE from 'three';
import { StoryFlags } from '../story/StoryFlag';

export type EnemyKind =
  | 'BASIC_YOKAI' | 'SHIELDED_YOKAI' | 'MINION'
  | 'SHADOW_YOKAI' | 'SHADOW_CALLER' | 'LURKING_SHADE'
  | 'TENGU'
  // Levels II to V
  | 'KAPPA' | 'KAMAITACHI' | 'KAMAITACHI_LURKER' | 'SPIDERLING' | 'POSSESSED_MONK'
  | 'UMIBOZU' | 'JOROGUMO' | 'FALLEN_SAMURAI' | 'AKANE' | 'MAW_OF_YOMI';

export interface EnemySpawnDef {
  type: EnemyKind;
  offset: THREE.Vector3; // Relative to encounter center
  /** Makes this enemy the chapter's elite, shown with a health bar of its own. */
  eliteName?: string;
}

export interface WaveConfig {
  enemies: EnemySpawnDef[];
  delayAfterComplete: number; // seconds to wait before next wave
}

/** Bursts of corruption from the ground while the fight goes on. */
export interface HazardConfig {
  interval: number;
  radius: number;
  damage: number;
}

export interface EncounterConfig {
  id: string;
  center: THREE.Vector3;
  activationRadius: number;
  leashRadius: number; // Max distance an enemy will chase
  reward?: number; // Spirit Essence reward for completion
  /** A charm handed over when the fight is won. */
  charmReward?: string;
  /** Off the main path, so the story doesn't wait on it. */
  isOptional?: boolean;
  hazard?: HazardConfig;
  /** Only happens if this story flag is set. */
  requiresFlag?: keyof StoryFlags;
  /** Once won, never comes back, even after resting. */
  once?: boolean;
  /** Never happens if this story flag is set. */
  unlessFlag?: keyof StoryFlags;
  waves: WaveConfig[];
}
