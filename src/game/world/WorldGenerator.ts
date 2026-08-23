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
import { ArenaGenerator } from '../boss/arena/ArenaGenerator';
import { WispGenerator } from './WispGenerator';

export class WorldGenerator {
  public wispsGroup: THREE.Group;

  constructor(scene: THREE.Scene, collisionSystem: CollisionSystem) {
    const random = new SeededRandom(GAME_CONFIG.WORLD_SEED);
    
    // Group to hold the entire world
    const worldGroup = new THREE.Group();
    worldGroup.name = 'World';

    // 1. Terrain
    worldGroup.add(TerrainGenerator.generate(random));

    // 2. Mountains (distant background)
    worldGroup.add(MountainGenerator.generate(random));

    // 3. Temple (focal point - now at Temple Approach zone)
    worldGroup.add(TempleGenerator.generate(collisionSystem));

    // 3b. Boss Arena (Phase 4)
    worldGroup.add(ArenaGenerator.generate(random, collisionSystem));

    // 4. Entrance Torii Gate (at entrance zone z=55)
    const entranceTorii = ToriiGenerator.generate(collisionSystem);
    entranceTorii.position.set(0, 0, 55);
    collisionSystem.addBox(new THREE.Box3(
      new THREE.Vector3(-4, 0, 54),
      new THREE.Vector3(-3, 8, 56)
    ));
    collisionSystem.addBox(new THREE.Box3(
      new THREE.Vector3(3, 0, 54),
      new THREE.Vector3(4, 8, 56)
    ));
    worldGroup.add(entranceTorii);

    // 4b. Courtyard Torii (marking courtyard boundary z=20)
    const courtyardTorii = ToriiGenerator.generate(collisionSystem);
    courtyardTorii.position.set(0, 0, 20);
    courtyardTorii.scale.setScalar(0.85); // Slightly smaller
    collisionSystem.addBox(new THREE.Box3(
      new THREE.Vector3(-3.5, 0, 19),
      new THREE.Vector3(-2.5, 7, 21)
    ));
    collisionSystem.addBox(new THREE.Box3(
      new THREE.Vector3(2.5, 0, 19),
      new THREE.Vector3(3.5, 7, 21)
    ));
    worldGroup.add(courtyardTorii);

    // 4c. Cursed Forest Torii (marks start of forest path at z=-20)
    const forestTorii = ToriiGenerator.generate(collisionSystem);
    forestTorii.position.set(-6, 0, -20); // Placed on the side like the image
    forestTorii.rotation.y = Math.PI / 8; // Angled
    worldGroup.add(forestTorii);

    // 5. Small Shrines
    worldGroup.add(ShrineGenerator.generate(random, collisionSystem));

    // 6. Lanterns (scattered, guiding path)
    worldGroup.add(LanternGenerator.generate(random, collisionSystem));

    // 7. Trees (sides and background)
    worldGroup.add(TreeGenerator.generate(random, collisionSystem));

    // 8. Rocks (perimeter)
    worldGroup.add(RockGenerator.generate(random, collisionSystem));

    // 9. Wisps
    this.wispsGroup = WispGenerator.generate(random);
    worldGroup.add(this.wispsGroup);

    scene.add(worldGroup);
  }

  public update(time: number): void {
    if (this.wispsGroup) {
      WispGenerator.update(this.wispsGroup, time);
    }
  }
}
