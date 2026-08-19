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
import { CollisionSystem } from '../physics/CollisionSystem';

export class WorldGenerator {
  constructor(scene: THREE.Scene, collisionSystem: CollisionSystem) {
    const random = new SeededRandom(GAME_CONFIG.WORLD_SEED);
    
    // Group to hold the entire world
    const worldGroup = new THREE.Group();
    worldGroup.name = 'World';

    // 1. Terrain
    worldGroup.add(TerrainGenerator.generate(random));

    // 2. Mountains (distant background)
    worldGroup.add(MountainGenerator.generate(random));

    // 3. Temple (focal point at the back)
    worldGroup.add(TempleGenerator.generate(collisionSystem));

    // 4. Torii Gate (entrance)
    const torii = ToriiGenerator.generate(collisionSystem);
    torii.position.set(0, 0, 15);
    collisionSystem.addBox(new THREE.Box3(
      new THREE.Vector3(-4, 0, 14),
      new THREE.Vector3(-3, 8, 16)
    ));
    collisionSystem.addBox(new THREE.Box3(
      new THREE.Vector3(3, 0, 14),
      new THREE.Vector3(4, 8, 16)
    ));
    worldGroup.add(torii);

    // 5. Small Shrines
    worldGroup.add(ShrineGenerator.generate(random, collisionSystem));

    // 6. Lanterns (scattered, guiding path)
    worldGroup.add(LanternGenerator.generate(random, collisionSystem));

    // 7. Trees (sides and background)
    worldGroup.add(TreeGenerator.generate(random, collisionSystem));

    // 8. Rocks (perimeter)
    worldGroup.add(RockGenerator.generate(random, collisionSystem));

    scene.add(worldGroup);
  }
}
