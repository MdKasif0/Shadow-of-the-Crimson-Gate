import { ChapterId } from '../story/StoryChapter';
import { StoryFlags } from '../story/StoryFlag';
import { Objective } from '../objectives/Objective';

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
}
