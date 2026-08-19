import * as THREE from 'three';
import { TerrainGenerator } from './TerrainGenerator';
import { TempleGenerator } from './TempleGenerator';
import { ToriiGenerator } from './ToriiGenerator';
import { ShrineGenerator } from './ShrineGenerator';
import { TreeGenerator } from './TreeGenerator';
import { RockGenerator } from './RockGenerator';
import { LanternGenerator } from './LanternGenerator';
import { MountainGenerator } from './MountainGenerator';
import { CollisionSystem } from '../physics/CollisionSystem';
import { GAME_CONFIG } from '../GameConfig';

export class WorldGenerator {
  public root: THREE.Group;

  constructor(scene: THREE.Scene, collisionSystem: CollisionSystem) {
    this.root = new THREE.Group();
    scene.add(this.root);
    this.generate(collisionSystem);
  }

  private generate(collision: CollisionSystem): void {
    // 1. Terrain
    const terrain = TerrainGenerator.create(GAME_CONFIG.WORLD.SIZE);
    this.root.add(terrain);

    // 2. Mountains (background, no collision)
    const mountains = MountainGenerator.create();
    this.root.add(mountains);

    // 3. Temple (centered at back)
    const temple = TempleGenerator.create();
    temple.position.set(0, 0, -18);
    this.root.add(temple);
    collision.addBox(new THREE.Box3(
      new THREE.Vector3(-6, 0, -22), new THREE.Vector3(6, 10, -14)
    ));

    // 4. Torii Gate (entrance framing)
    const torii = ToriiGenerator.create(6);
    torii.position.set(0, 0, -8);
    this.root.add(torii);
    collision.addCircle(new THREE.Vector3(-3, 0, -8), 0.4);
    collision.addCircle(new THREE.Vector3(3, 0, -8), 0.4);

    // 5. Shrine (side point of interest)
    const shrine = ShrineGenerator.create();
    shrine.position.set(14, 0, -5);
    shrine.rotation.y = -Math.PI / 6;
    this.root.add(shrine);
    collision.addCircle(new THREE.Vector3(14, 0, -5), 1.5);

    // 6. Sakura Trees (edge scatter to frame scene)
    const treeData = [
      { x: -16, z: -14, seed: 1, h: 10 },
      { x: 16, z: -12, seed: 2, h: 12 },
      { x: -14, z: 2, seed: 3, h: 9 },
      { x: 15, z: 5, seed: 4, h: 11 },
      { x: -18, z: 10, seed: 5, h: 10 },
      { x: 17, z: 12, seed: 6, h: 8 },
      { x: -10, z: -18, seed: 7, h: 7 },
      { x: 10, z: -16, seed: 8, h: 9 },
    ];
    treeData.forEach(t => {
      const tree = TreeGenerator.create(t.seed, t.h);
      tree.position.set(t.x, 0, t.z);
      tree.rotation.y = t.seed * 1.3;
      this.root.add(tree);
      collision.addCircle(new THREE.Vector3(t.x, 0, t.z), 0.6);
    });

    // 7. Lanterns (along pathways)
    const lanternData = [
      { x: -3, z: -5, v: 0 }, { x: 3, z: -5, v: 1 },
      { x: -3, z: -12, v: 0 }, { x: 3, z: -12, v: 1 },
      { x: -8, z: 0, v: 2 }, { x: 8, z: 0, v: 0 },
      { x: -5, z: 8, v: 1 }, { x: 5, z: 10, v: 2 },
    ];
    lanternData.forEach(l => {
      const lantern = LanternGenerator.create(l.v);
      lantern.position.set(l.x, 0, l.z);
      this.root.add(lantern);
      collision.addCircle(new THREE.Vector3(l.x, 0, l.z), 0.35);
    });

    // 8. Rocks (clutter)
    const rockData = [
      { x: -7, z: -16, s: 100, r: 1.0 },
      { x: 9, z: -14, s: 200, r: 0.7 },
      { x: -12, z: 6, s: 300, r: 1.2 },
      { x: 11, z: 8, s: 400, r: 0.9 },
      { x: 2, z: 15, s: 500, r: 0.6 },
      { x: -4, z: -20, s: 600, r: 0.8 },
    ];
    rockData.forEach(r => {
      const rock = RockGenerator.create(r.s, r.r);
      rock.position.set(r.x, r.r * 0.3, r.z);
      rock.rotation.y = r.s * 0.5;
      this.root.add(rock);
      collision.addCircle(new THREE.Vector3(r.x, 0, r.z), r.r * 0.8);
    });
  }
}
