import * as THREE from 'three';
import { SeededRandom } from '../utils/MathUtils';
import { GAME_CONFIG } from '../GameConfig';
import { CollisionSystem } from '../collision/CollisionSystem';

export class TreeGenerator {
  public static generate(random: SeededRandom, collisionSystem: CollisionSystem): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Trees';

    const treeCount = 150;
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a1a1a, roughness: 0.9 });
    
    // Foliage instancing setup
    const foliageGeo = new THREE.DodecahedronGeometry(1.2, 0); // low poly cluster
    // Slightly squash it
    foliageGeo.scale(1, 0.7, 1);
    foliageGeo.computeVertexNormals();

    const foliageMat = new THREE.MeshStandardMaterial({ 
      color: 0xffaacc, 
      roughness: 0.6,
      transparent: true,
      opacity: 0.9,
    });
    
    // We might have ~15 clusters per tree
    const maxFoliage = treeCount * 18;
    const foliageInstanced = new THREE.InstancedMesh(foliageGeo, foliageMat, maxFoliage);
    foliageInstanced.castShadow = true;
    let foliageIndex = 0;
    const dummy = new THREE.Object3D();

    let placed = 0;
    let attempts = 0;
    while (placed < treeCount && attempts < 2000) {
      attempts++;
      const x = random.range(-45, 45);
      const z = random.range(-75, 35);
      
      // Carve out safe zones where trees CANNOT spawn
      
      // 1. Entrance Path (x: -6 to 6, z: 0 to 40)
      if (Math.abs(x) < 8 && z > 0) continue;
      
      // 2. Courtyard (radius 20 around 0, 0, -5)
      const distToCourtyard = Math.sqrt(x*x + Math.pow(z + 5, 2));
      if (distToCourtyard < 20) continue;
      
      // 3. Shrine area (radius 15 around -25, 0, -20)
      const distToShrine = Math.sqrt(Math.pow(x + 25, 2) + Math.pow(z + 20, 2));
      if (distToShrine < 15) continue;
      
      // 4. Forest Path (clear a path through x>0, z<0)
      if (x > 5 && x < 35 && z > -35 && z < -10) {
         // Distance to center of the forest arena
         const distToArena = Math.sqrt(Math.pow(x - 25, 2) + Math.pow(z + 25, 2));
         if (distToArena < 15) continue;
      }
      
      // 5. Temple approach (x: -15 to 15, z: -70 to -35)
      if (Math.abs(x) < 18 && z < -35) continue;

      const tree = new THREE.Group();
      tree.position.set(x, 0, z);

      // Height and thickness variation
      const height = random.range(5, 9);
      const radiusBottom = random.range(0.4, 0.6);
      const radiusTop = radiusBottom * 0.4;
      
      const trunkGeo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 6);
      trunkGeo.translate(0, height / 2, 0);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      
      // Add slight lean
      trunk.rotation.x = (random.next() - 0.5) * 0.2;
      trunk.rotation.z = (random.next() - 0.5) * 0.2;
      trunk.rotation.y = random.next() * Math.PI * 2;
      tree.add(trunk);

      // Generate branches and foliage
      const branchCount = Math.floor(random.range(3, 6));
      for (let b = 0; b < branchCount; b++) {
        const bHeight = height * random.range(0.4, 0.9);
        const bLength = random.range(2, 4);
        
        const branchGeo = new THREE.CylinderGeometry(radiusTop * 0.4, radiusTop * 0.8, bLength, 5);
        branchGeo.translate(0, bLength / 2, 0);
        const branch = new THREE.Mesh(branchGeo, trunkMat);
        branch.castShadow = true;
        
        branch.position.y = bHeight;
        branch.rotation.x = random.range(0.4, 1.2);
        branch.rotation.y = (b / branchCount) * Math.PI * 2 + random.next() * 0.5;
        
        trunk.add(branch);

        // Add 2-3 foliage clusters per branch
        const clusterCount = Math.floor(random.range(2, 4));
        for (let c = 0; c < clusterCount; c++) {
          if (foliageIndex < maxFoliage) {
            // Calculate absolute position of foliage
            dummy.position.set(0, bLength * random.range(0.6, 1.1), 0);
            
            // Jitter cluster position
            dummy.position.x += (random.next() - 0.5) * 1.5;
            dummy.position.y += (random.next() - 0.5) * 1.0;
            dummy.position.z += (random.next() - 0.5) * 1.5;
            
            const scale = random.range(1.2, 2.2);
            dummy.scale.set(scale, scale, scale);
            
            dummy.rotation.set(random.next(), random.next(), random.next());
            
            // Apply transformations
            branch.updateMatrixWorld();
            dummy.applyMatrix4(branch.matrixWorld);
            
            foliageInstanced.setMatrixAt(foliageIndex, dummy.matrix);
            
            // Color variation (some darker rose, some pale)
            const colorVariant = new THREE.Color(0xffaacc);
            if (random.next() > 0.7) colorVariant.setHex(0xff7799);
            else if (random.next() > 0.8) colorVariant.setHex(0xffffff);
            foliageInstanced.setColorAt(foliageIndex, colorVariant);
            
            foliageIndex++;
          }
        }
      }
      
      // Top foliage cluster
      if (foliageIndex < maxFoliage) {
        dummy.position.set(0, height, 0);
        const scale = random.range(2.0, 3.0);
        dummy.scale.set(scale, scale, scale);
        trunk.updateMatrixWorld();
        dummy.applyMatrix4(trunk.matrixWorld);
        foliageInstanced.setMatrixAt(foliageIndex, dummy.matrix);
        foliageInstanced.setColorAt(foliageIndex, new THREE.Color(0xffaacc));
        foliageIndex++;
      }

      group.add(tree);
      placed++;
    }

    foliageInstanced.instanceMatrix.needsUpdate = true;
    if (foliageInstanced.instanceColor) foliageInstanced.instanceColor.needsUpdate = true;
    
    group.add(foliageInstanced);
    return group;
  }
}
