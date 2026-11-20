import { CollisionSystem } from '../collision/CollisionSystem';
import { LevelId, LevelRuntime } from './LevelTypes';
import { buildDrownedVillage } from './DrownedVillage';
import { buildBambooLabyrinth } from './BambooLabyrinth';
import { buildBurningTemple } from './BurningTemple';
import { buildGateOfYomi } from './GateOfYomi';

/** Builds one of the later levels. The courtyard is the original world and isn't built here. */
export function buildLevel(id: Exclude<LevelId, 'courtyard'>, collision: CollisionSystem): LevelRuntime {
  switch (id) {
    case 'village': return buildDrownedVillage(collision);
    case 'bamboo': return buildBambooLabyrinth(collision);
    case 'temple': return buildBurningTemple(collision);
    case 'gate': return buildGateOfYomi(collision);
  }
}
