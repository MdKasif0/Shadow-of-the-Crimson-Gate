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
    const numLanterns = 0; // Disabled to avoid max point light shader limits
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
      
      const lantern = LanternGenerator.generateSingle();
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

      // Cherry blossom trees (placeholder logic, simple tree for boss arena)
      if (random.next() > 0.4) {
        const tx = center.x + Math.cos(angle - 0.2) * (debrisR + 2);
        const tz = center.z + Math.sin(angle - 0.2) * (debrisR + 2);
        
        const treeGroup = new THREE.Group();
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a1a1a, roughness: 0.9 });
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 4, 5);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 2;
        treeGroup.add(trunk);
        
        const foliageMat = new THREE.MeshStandardMaterial({ color: 0xffb7c5, roughness: 0.8, flatShading: true });
        const foliageGeo = new THREE.DodecahedronGeometry(2, 0);
        foliageGeo.scale(1, 0.7, 1);
        const foliage = new THREE.Mesh(foliageGeo, foliageMat);
        foliage.position.y = 4.5;
        treeGroup.add(foliage);
        
        treeGroup.position.set(tx, 0, tz);
        arenaGroup.add(treeGroup);
      }
    }

    // 4. Broken Torii Fragments at the back of the arena
    const backAngle = -Math.PI / 2; // North
    const tx = center.x + Math.cos(backAngle) * (floorRadius - 1);
    const tz = center.z + Math.sin(backAngle) * (floorRadius - 1);
    
    // Create a ruined shrine backdrop
    const shrineGrp = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x1a110a, roughness: 0.9 });
    const pillar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4, 8), woodMat);
    pillar1.position.set(-2, 2, 0);
    const pillar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3, 8), woodMat);
    pillar2.position.set(2, 1.5, 0);
    pillar2.rotation.z = 0.2;
    shrineGrp.add(pillar1);
    shrineGrp.add(pillar2);
    
    shrineGrp.position.set(tx, 0, tz);
    arenaGroup.add(shrineGrp);

    return arenaGroup;
  }
}
