import * as THREE from 'three';
import { SeededRandom } from '../utils/MathUtils';
import { GAME_CONFIG } from '../GameConfig';
import { TerrainGenerator } from './TerrainGenerator';
import { RockGenerator } from './RockGenerator';
import { TreeGenerator } from './TreeGenerator';
import { LanternGenerator } from './LanternGenerator';
import { ToriiGenerator } from './ToriiGenerator';
import { ShrineGenerator } from './ShrineGenerator';
import { TempleGenerator } from './TempleGenerator';
import { MountainGenerator } from './MountainGenerator';
import { CollisionSystem } from '../collision/CollisionSystem';

import { InteractionSystem } from '../core/InteractionSystem';

export class WorldGenerator {
  constructor(scene: THREE.Scene, collisionSystem: CollisionSystem, interactionSystem: InteractionSystem, playerRef: any) {
    const random = new SeededRandom(GAME_CONFIG.WORLD_SEED);
    
    // Group to hold the entire world
    const worldGroup = new THREE.Group();
    worldGroup.name = 'World';

    // 1. Terrain
    worldGroup.add(TerrainGenerator.generate(random));

    // 2. Mountains (distant background)
    worldGroup.add(MountainGenerator.generate(random));

    // 3. Temple (focal point at the back)
    worldGroup.add(TempleGenerator.generate(collisionSystem, new THREE.Vector3(0, 0, -60)));

    // 4. Torii Gate (entrance)
    const torii = ToriiGenerator.generate(collisionSystem);
    torii.position.set(0, 0, 20); // Moved back to make Entrance zone
    collisionSystem.addBox(new THREE.Box3(
      new THREE.Vector3(-4, 0, 19),
      new THREE.Vector3(-3, 8, 21)
    ));
    collisionSystem.addBox(new THREE.Box3(
      new THREE.Vector3(3, 0, 19),
      new THREE.Vector3(4, 8, 21)
    ));
    worldGroup.add(torii);

    // 5. Main Shrine (Interactive) in the Shrine Zone
    worldGroup.add(ShrineGenerator.generate(
      new THREE.Vector3(-25, 0, -20), 
      Math.PI / 4, 
      collisionSystem, 
      interactionSystem, 
      playerRef
    ));

    // 6. Lanterns (scattered, guiding path)
    worldGroup.add(LanternGenerator.generate(random, collisionSystem));

    // 7. Trees (sides and background, dense in forest)
    worldGroup.add(TreeGenerator.generate(random, collisionSystem));

    // 8. Rocks (perimeter)
    worldGroup.add(RockGenerator.generate(random, collisionSystem));

    scene.add(worldGroup);
  }
}
