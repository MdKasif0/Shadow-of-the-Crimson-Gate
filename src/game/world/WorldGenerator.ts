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
import { LoadReporter, subProgress } from '../ui/LoadingScreen';

export class WorldGenerator {
  /**
   * Builds the world in stages, pausing between them so the loading bar can move.
   * The stage order must not change: every stage draws from one seeded random
   * sequence, so reordering them would rearrange the whole world.
   */
  public static async build(scene: THREE.Scene, collisionSystem: CollisionSystem, report: LoadReporter): Promise<THREE.Group> {
    const random = new SeededRandom(GAME_CONFIG.WORLD_SEED);

    const worldGroup = new THREE.Group();
    worldGroup.name = 'World';

    await report(0, 'Raising the valley');
    worldGroup.add(TerrainGenerator.generate(random));
    await report(0.08);

    worldGroup.add(PathGenerator.generate(random));
    worldGroup.add(MountainGenerator.generate(random));
    await report(0.14, 'Carving the temple');

    worldGroup.add(TempleGenerator.generate(collisionSystem));
    worldGroup.add(ArenaGenerator.generate(random, collisionSystem));
    await report(0.18);

    // Entrance Torii Gate
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

    // Courtyard Torii, marking the courtyard boundary
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

    worldGroup.add(ShrineGenerator.generate(random, collisionSystem));
    await report(0.2, 'Lighting the lanterns');

    worldGroup.add(LanternGenerator.generate(random, collisionSystem));
    await report(0.22, 'Tending the sakura');

    worldGroup.add(await TreeGenerator.generate(random, collisionSystem, subProgress(report, 0.22, 0.96)));
    await report(0.96, 'Scattering the stones');

    worldGroup.add(RockGenerator.generate(random, collisionSystem));

    // Sharp, nearby shadows mean every surface can now safely receive them
    worldGroup.traverse(object => {
      if ((object as THREE.Mesh).isMesh && !(object as THREE.Sprite).isSprite) {
        object.receiveShadow = true;
      }
    });

    scene.add(worldGroup);
    await report(1);
    return worldGroup;
  }
}
