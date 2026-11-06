import * as THREE from 'three';
import { SeededRandom } from '../utils/MathUtils';
import { CollisionSystem } from '../collision/CollisionSystem';
import { GAME_CONFIG } from '../GameConfig';
import { TerrainGenerator } from './TerrainGenerator';
import { buildCedar, buildDeadTree, buildSakura } from './FoliageBuilder';

/** Large sakura placed by hand to frame the walk through the courtyard. */
const HERO_SAKURA = [
  { x: -11, z: 38 }, { x: 12, z: 33 },
  { x: -13, z: 11 }, { x: 11, z: 7 },
  { x: -10, z: -4 }, { x: 13, z: -14 },
];

export class TreeGenerator {
  public static generate(random: SeededRandom, collisionSystem: CollisionSystem): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Trees';

    const bounds = GAME_CONFIG.WORLD.BOUNDS;

    const place = (tree: THREE.Group, x: number, z: number) => {
      tree.position.set(x, TerrainGenerator.heightAt(x, z) - 0.1, z);
      tree.rotation.y = random.next() * Math.PI * 2;
      group.add(tree);
      if (Math.abs(x) <= bounds.MAX_X + 1) {
        collisionSystem.addSphere(new THREE.Vector3(x, 0, z), 0.55);
      }
    };

    for (const spot of HERO_SAKURA) {
      place(buildSakura(random, 1.25, true), spot.x, spot.z);
    }

    // A dense stand of cedars close around the path makes the forest feel enclosed
    for (let i = 0; i < 70; i++) {
      const side = random.next() > 0.5 ? 1 : -1;
      const x = side * random.range(7.5, 30);
      const z = random.range(-53, -21);
      place(random.next() > 0.12 ? buildCedar(random, random.range(0.85, 1.3)) : buildDeadTree(random, 1.1), x, z);
    }

    const treeCount = 125;
    let placed = 0;
    let attempts = 0;
    while (placed < treeCount && attempts++ < 3000) {
      // Half the trees line the playable valley; the rest thicken the hills beyond it
      const onHills = random.next() > 0.5;
      const side = random.next() > 0.5 ? 1 : -1;
      const x = side * (onHills ? random.range(30, 72) : random.range(9, 30));
      const z = random.range(-180, 100);

      if (!this.isClear(x, z)) continue;

      const scale = random.range(0.85, 1.25);
      let tree: THREE.Group;
      if (z > -22) {
        tree = random.next() > 0.18 ? buildSakura(random, scale) : buildCedar(random, scale);
      } else if (z > -55) {
        tree = random.next() > 0.14 ? buildCedar(random, scale * 1.1) : buildDeadTree(random, scale);
      } else {
        tree = random.next() > 0.45 ? buildDeadTree(random, scale * 1.2) : buildCedar(random, scale);
      }

      place(tree, x, z);
      placed++;
    }

    return group;
  }

  private static isClear(x: number, z: number): boolean {
    const distFromCenter = Math.abs(x);

    // Temple and boss arena
    if (z < -50 && z > -80 && distFromCenter < 18) return false;
    if (z < -86 && z > -144 && distFromCenter < 30) return false;

    // Courtyard fighting space, and the shrines at either side
    if (z > 0 && z < 40 && distFromCenter < 15) return false;

    // Forest path needs a wider gap than the trunk, as canopies spread
    return distFromCenter > 9;
  }
}
