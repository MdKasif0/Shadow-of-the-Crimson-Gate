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
import { PathGenerator } from './PathGenerator';
import { WorldLights } from '../lighting/WorldLights';

export class WorldGenerator {
  public readonly worldGroup: THREE.Group;

  constructor(scene: THREE.Scene, collisionSystem: CollisionSystem) {
    const random = new SeededRandom(GAME_CONFIG.WORLD_SEED);
    
    // Group to hold the entire world
    const worldGroup = new THREE.Group();
    worldGroup.name = 'World';
    this.worldGroup = worldGroup;

    // 1. Terrain
    worldGroup.add(TerrainGenerator.generate(random));
    worldGroup.add(PathGenerator.generate(random));

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
    WorldLights.add(0, 7, 53, 0xffb060, 40, 18);

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
    WorldLights.add(0, 6, 18, 0xffb060, 34, 16);

    // 5. Small Shrines
    worldGroup.add(ShrineGenerator.generate(random, collisionSystem));

    // 6. Lanterns (scattered, guiding path)
    worldGroup.add(LanternGenerator.generate(random, collisionSystem));

    // 7. Trees (sides and background)
    worldGroup.add(TreeGenerator.generate(random, collisionSystem));

    // 8. Rocks (perimeter)
    worldGroup.add(RockGenerator.generate(random, collisionSystem));

    // Sharp, nearby shadows mean every surface can now safely receive them
    worldGroup.traverse(object => {
      if ((object as THREE.Mesh).isMesh && !(object as THREE.Sprite).isSprite) {
        object.receiveShadow = true;
      }
    });

    scene.add(worldGroup);
  }
}
