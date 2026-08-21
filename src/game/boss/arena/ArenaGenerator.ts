import * as THREE from 'three';
import { SeededRandom } from '../../utils/MathUtils';
import { CollisionSystem } from '../../collision/CollisionSystem';
import { RockGenerator } from '../../world/RockGenerator';
import { TreeGenerator } from '../../world/TreeGenerator';
import { LanternGenerator } from '../../world/LanternGenerator';
import { ToriiGenerator } from '../../world/ToriiGenerator';
import { ShrineGenerator } from '../../world/ShrineGenerator';
import { ArenaBounds } from './ArenaBounds';

/**
 * ArenaGenerator — Procedurally generates the Crimson Oni boss arena.
 */
export class ArenaGenerator {
  public static readonly CENTER_Z = -115;
  public static readonly ARENA_RADIUS = 18;

  public static generate(random: SeededRandom, collisionSystem: CollisionSystem): THREE.Group {
    const arenaGroup = new THREE.Group();
    arenaGroup.name = 'BossArena';

    const center = new THREE.Vector3(0, 0, this.CENTER_Z);

    // 1. Generate Circular Floor
    const floorRadius = this.ARENA_RADIUS;
    const floorGeo = new THREE.CylinderGeometry(floorRadius, floorRadius + 2, 0.4, 32);
    // Perturb vertices for uneven, ancient stone feel
    const pos = floorGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > 0) { // Only top face
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const dist = Math.sqrt(x*x + z*z);
        // Add concentric wavy patterns
        const wave = Math.sin(dist * 2.0) * 0.05 + random.next() * 0.05;
        pos.setY(i, y + wave);
      }
    }
    floorGeo.computeVertexNormals();
    
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a20, 
      roughness: 0.9, 
      metalness: 0.1,
      flatShading: true
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.copy(center);
    floor.position.y = -0.2; // Flush with ground
    floor.receiveShadow = true;
    arenaGroup.add(floor);

    // 2. Register Physical Boundaries
    ArenaBounds.registerCircularBounds(collisionSystem, center, this.ARENA_RADIUS, 24);

    // 3. Populate Outer Ring
    // We will place environmental objects just outside the boundary circle
    const numLanterns = 8;
    for (let i = 0; i < numLanterns; i++) {
      const angle = (i / numLanterns) * Math.PI * 2 + (Math.PI / numLanterns);
      
      // Don't block the entrance at Z = -97 (which is angle roughly -PI/2)
      // Entrance is towards +Z (angle = Math.PI/2)
      const isEntrance = (angle > Math.PI / 2 - 0.5) && (angle < Math.PI / 2 + 0.5);
      if (isEntrance) continue;

      // Lanterns
      const lanternR = floorRadius - 1.5;
      const lx = center.x + Math.cos(angle) * lanternR;
      const lz = center.z + Math.sin(angle) * lanternR;
      
      const lantern = LanternGenerator.generate(collisionSystem);
      lantern.position.set(lx, 0, lz);
      lantern.rotation.y = angle + Math.PI; // Face center
      arenaGroup.add(lantern);

      // Rocks and debris outside bounds
      const debrisR = floorRadius + 1;
      const rx = center.x + Math.cos(angle + 0.2) * debrisR;
      const rz = center.z + Math.sin(angle + 0.2) * debrisR;
      const rock = RockGenerator.generateSingle(random, 1.5 + random.next() * 1.5);
      rock.position.set(rx, 0, rz);
      arenaGroup.add(rock);

      // Cherry blossom trees
      if (random.next() > 0.4) {
        const tx = center.x + Math.cos(angle - 0.2) * (debrisR + 2);
        const tz = center.z + Math.sin(angle - 0.2) * (debrisR + 2);
        const tree = TreeGenerator.generateTree(random);
        tree.position.set(tx, 0, tz);
        arenaGroup.add(tree);
      }
    }

    // 4. Broken Torii Fragments at the back of the arena
    const backAngle = -Math.PI / 2; // North
    const tx = center.x + Math.cos(backAngle) * (floorRadius - 1);
    const tz = center.z + Math.sin(backAngle) * (floorRadius - 1);
    
    // Create a ruined shrine backdrop
    const shrineGrp = ShrineGenerator.generateSingle(random, collisionSystem);
    shrineGrp.position.set(tx, 0, tz);
    arenaGroup.add(shrineGrp);

    return arenaGroup;
  }
}
