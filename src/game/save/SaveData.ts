import { ChapterId } from '../story/StoryChapter';
import { StoryFlags } from '../story/StoryFlag';
import { Objective } from '../objectives/Objective';
import { BuildSave } from '../progression/PlayerBuild';
import { LevelId, LevelProgressSave } from '../levels/LevelTypes';

export interface SaveData {
  version: number;
  chapter: ChapterId;
  objective: Objective | null;
  playerPosition: { x: number, y: number, z: number };
  spiritEssence: number;
  level: number;
  clearedEncounters: string[];
  storyFlags: StoryFlags;
  crimsonOniDefeated: boolean;
  /** Skills, charms and techniques. Missing from saves made before they existed. */
  build?: BuildSave;
  /** Essence left where the Ronin last fell, waiting to be recovered. */
  droppedEssence?: { x: number; y: number; z: number; amount: number; level?: LevelId } | null;
  /** When this was written, in milliseconds since 1970. Missing from older saves. */
  savedAt?: number;
  /** Which level the Ronin is in, which are open and cleared, and best times. */
  levels?: LevelProgressSave;
  /** Secrets already taken, and wards already broken. */
  collected?: string[];
}
